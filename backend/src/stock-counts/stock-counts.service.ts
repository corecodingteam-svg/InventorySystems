import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'kysely';
import { KYSELY, Db } from '../database/database.module';
import { Database } from '../database/schema';
import { InventoryService } from '../inventory/inventory.service';
import { NIL_UUID } from '../common/constants';
import { generateDocNumber } from '../common/generate-doc-number';
import { paginate } from '../common/pagination/list-query.dto';
import { CreateStockCountDto, StockCountListQueryDto, SubmitStockCountDto } from './dto/stock-count.dto';

@Injectable()
export class StockCountsService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private inventoryService: InventoryService,
  ) {}

  async list(organizationId: string, query: StockCountListQueryDto) {
    let builder = this.db
      .selectFrom('stock_counts as sc')
      .innerJoin('warehouses as w', 'w.id', 'sc.warehouse_id')
      .select(['sc.id', 'sc.count_number', 'sc.count_type', 'sc.status', 'sc.warehouse_id', 'w.name as warehouse_name', 'sc.created_at'])
      .where('sc.organization_id', '=', organizationId);

    if (query.warehouseId) builder = builder.where('sc.warehouse_id', '=', query.warehouseId);
    if (query.status) builder = builder.where('sc.status', '=', query.status);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('sc.created_at', 'desc')
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
      .execute();

    return paginate(rows, total, query.page, query.pageSize);
  }

  async findOne(organizationId: string, id: string) {
    return this.findOneWith(this.db, organizationId, id);
  }

  /**
   * Same read as findOne, but runnable against a caller-supplied
   * transaction — needed because create() must read back what it just
   * inserted before that insert has committed, which this.db (a separate
   * connection) cannot see yet. See docs/mobile-offline.md.
   */
  private async findOneWith(executor: Db | Transaction<Database>, organizationId: string, id: string) {
    const count = await executor
      .selectFrom('stock_counts')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!count) throw new NotFoundException('Stock count not found.');

    const lines = await executor
      .selectFrom('stock_count_lines as scl')
      .innerJoin('products as p', 'p.id', 'scl.product_id')
      .select(['scl.id', 'scl.product_id', 'p.sku', 'p.name as product_name', 'scl.variant_id', 'scl.system_quantity', 'scl.counted_quantity'])
      .where('scl.organization_id', '=', organizationId)
      .where('scl.stock_count_id', '=', id)
      .execute();

    return { ...count, lines };
  }

  /** Snapshots current on-hand per product (see stock_count_lines.system_quantity comment in the migration) as the count's baseline. */
  async create(organizationId: string, userId: string | null, dto: CreateStockCountDto) {
    return this.db.transaction().execute(async (trx) => {
      const count = await trx
        .insertInto('stock_counts')
        .values({
          organization_id: organizationId,
          count_number: generateDocNumber('SC'),
          warehouse_id: dto.warehouseId,
          count_type: dto.countType ?? 'CYCLE',
          notes: dto.notes ?? null,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      let balances = trx
        .selectFrom('stock_balances')
        .select(['product_id', 'variant_id', 'on_hand'])
        .where('organization_id', '=', organizationId)
        .where('warehouse_id', '=', dto.warehouseId);
      if (dto.productIds && dto.productIds.length > 0) {
        balances = balances.where('product_id', 'in', dto.productIds);
      }
      const rows = await balances.execute();

      if (rows.length > 0) {
        await trx
          .insertInto('stock_count_lines')
          .values(
            rows.map((r) => ({
              organization_id: organizationId,
              stock_count_id: count.id,
              product_id: r.product_id,
              variant_id: r.variant_id === NIL_UUID ? null : r.variant_id,
              system_quantity: r.on_hand,
            })),
          )
          .execute();
      }

      return this.findOneWith(trx, organizationId, count.id);
    });
  }

  async start(organizationId: string, id: string) {
    return this.transition(organizationId, id, ['DRAFT'], 'IN_PROGRESS');
  }

  /** Records counted quantities for the given lines and moves the count to SUBMITTED. Partial submission across multiple calls is fine — only supplied lines are touched. */
  async submit(organizationId: string, userId: string | null, id: string, dto: SubmitStockCountDto) {
    return this.db.transaction().execute(async (trx) => {
      const count = await trx
        .selectFrom('stock_counts')
        .select('status')
        .where('organization_id', '=', organizationId)
        .where('id', '=', id)
        .executeTakeFirst();
      if (!count) throw new NotFoundException('Stock count not found.');
      if (!['DRAFT', 'IN_PROGRESS'].includes(count.status)) {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot submit counts for a stock count in status ${count.status}.`,
        });
      }

      for (const line of dto.lines) {
        await trx
          .updateTable('stock_count_lines')
          .set({ counted_quantity: line.countedQuantity.toString(), counted_by: userId, counted_at: new Date() })
          .where('organization_id', '=', organizationId)
          .where('stock_count_id', '=', id)
          .where('id', '=', line.lineId)
          .execute();
      }

      return trx
        .updateTable('stock_counts')
        .set({ status: 'SUBMITTED', submitted_at: new Date() })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  /** Posts one ADJUSTMENT_IN/OUT movement per line with a non-zero variance (counted - system), through the inventory engine — never writes stock_balances directly. */
  async approve(organizationId: string, userId: string | null, id: string) {
    return this.db.transaction().execute(async (trx) => {
      const count = await trx
        .selectFrom('stock_counts')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .where('id', '=', id)
        .executeTakeFirst();
      if (!count) throw new NotFoundException('Stock count not found.');
      if (count.status !== 'SUBMITTED') {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot approve a stock count in status ${count.status}. It must be submitted first.`,
        });
      }

      const lines = await trx
        .selectFrom('stock_count_lines')
        .selectAll()
        .where('stock_count_id', '=', id)
        .execute();

      for (const line of lines) {
        if (line.counted_quantity === null) continue;
        const variance = Number(line.counted_quantity) - Number(line.system_quantity);
        if (variance === 0) continue;

        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: line.product_id,
          variantId: line.variant_id,
          warehouseId: count.warehouse_id,
          transactionType: variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantityIn: variance > 0 ? variance : undefined,
          quantityOut: variance < 0 ? Math.abs(variance) : undefined,
          referenceType: 'STOCK_COUNT',
          referenceId: id,
          notes: `Stock count ${count.count_number} variance adjustment`,
        });
      }

      return trx
        .updateTable('stock_counts')
        .set({ status: 'APPROVED', approved_by: userId, approved_at: new Date() })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  async cancel(organizationId: string, id: string) {
    return this.transition(organizationId, id, ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'], 'CANCELLED');
  }

  private async transition(organizationId: string, id: string, fromAny: string[], to: string) {
    const count = await this.db
      .selectFrom('stock_counts')
      .select('status')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!count) throw new NotFoundException('Stock count not found.');
    if (!fromAny.includes(count.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move a stock count from ${count.status} to ${to}.`,
      });
    }
    return this.db
      .updateTable('stock_counts')
      .set({ status: to })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
