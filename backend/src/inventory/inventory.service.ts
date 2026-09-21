import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql, Transaction } from 'kysely';
import { KYSELY, Db } from '../database/database.module';
import { Database } from '../database/schema';
import { NIL_UUID } from '../common/constants';
import { PostMovementInput } from './inventory.types';

/**
 * The single controlled entry point for every stock mutation in the system.
 * No other module may write to stock_balances or stock_ledger directly —
 * see docs/inventory-engine.md. Each call is one atomic, row-locked
 * transaction so concurrent movements against the same slot serialize
 * instead of racing (see docs/inventory-engine.md "Concurrency").
 */
@Injectable()
export class InventoryService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async postMovement(organizationId: string, userId: string | null, input: PostMovementInput) {
    return this.db.transaction().execute((trx) =>
      this.postMovementInTrx(trx, organizationId, userId, input),
    );
  }

  /** Executes within a caller-supplied transaction, so transfers can post OUT+IN atomically. */
  async postMovementInTrx(
    trx: Transaction<Database>,
    organizationId: string,
    userId: string | null,
    input: PostMovementInput,
  ) {
    const variantId = input.variantId ?? NIL_UUID;
    const locationId = input.locationId ?? NIL_UUID;
    const batchId = input.batchId ?? NIL_UUID;
    const quantityIn = input.quantityIn ?? 0;
    const quantityOut = input.quantityOut ?? 0;

    if (quantityIn < 0 || quantityOut < 0) {
      throw new ConflictException({
        code: 'INVALID_QUANTITY',
        message: 'Quantities must not be negative.',
      });
    }
    if (quantityIn === 0 && quantityOut === 0) {
      throw new ConflictException({
        code: 'INVALID_QUANTITY',
        message: 'A stock movement must have a non-zero quantity.',
      });
    }

    const product = await trx
      .selectFrom('products')
      .select(['id', 'allow_negative_stock'])
      .where('organization_id', '=', organizationId)
      .where('id', '=', input.productId)
      .executeTakeFirst();
    if (!product) throw new NotFoundException('Product not found.');

    const balance = await this.lockOrCreateBalance(trx, organizationId, {
      productId: input.productId,
      variantId,
      warehouseId: input.warehouseId,
      locationId,
      batchId,
    });

    const currentOnHand = Number(balance.on_hand);
    const newOnHand = currentOnHand + quantityIn - quantityOut;

    const allowNegative = input.allowNegativeOverride ?? product.allow_negative_stock;
    if (newOnHand < 0 && !allowNegative) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient available stock.',
      });
    }

    await trx
      .updateTable('stock_balances')
      .set({ on_hand: newOnHand.toString(), updated_at: sql`now()` })
      .where('id', '=', balance.id)
      .execute();

    const ledgerRow = await trx
      .insertInto('stock_ledger')
      .values({
        organization_id: organizationId,
        product_id: input.productId,
        variant_id: input.variantId ?? null,
        warehouse_id: input.warehouseId,
        location_id: input.locationId ?? null,
        batch_id: input.batchId ?? null,
        serial_number_id: input.serialNumberId ?? null,
        transaction_type: input.transactionType,
        reference_type: input.referenceType ?? null,
        reference_id: input.referenceId ?? null,
        quantity_in: quantityIn.toString(),
        quantity_out: quantityOut.toString(),
        unit_cost: (input.unitCost ?? 0).toString(),
        balance_quantity: newOnHand.toString(),
        notes: input.notes ?? null,
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return ledgerRow;
  }

  private async lockOrCreateBalance(
    trx: Transaction<Database>,
    organizationId: string,
    slot: { productId: string; variantId: string; warehouseId: string; locationId: string; batchId: string },
  ) {
    await trx
      .insertInto('stock_balances')
      .values({
        organization_id: organizationId,
        product_id: slot.productId,
        variant_id: slot.variantId,
        warehouse_id: slot.warehouseId,
        location_id: slot.locationId,
        batch_id: slot.batchId,
      })
      .onConflict((oc) =>
        oc
          .columns(['organization_id', 'product_id', 'variant_id', 'warehouse_id', 'location_id', 'batch_id'])
          .doNothing(),
      )
      .execute();

    return trx
      .selectFrom('stock_balances')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('product_id', '=', slot.productId)
      .where('variant_id', '=', slot.variantId)
      .where('warehouse_id', '=', slot.warehouseId)
      .where('location_id', '=', slot.locationId)
      .where('batch_id', '=', slot.batchId)
      .forUpdate()
      .executeTakeFirstOrThrow();
  }

  /**
   * Reserves stock for a confirmed sales order line without moving on_hand —
   * reservation only narrows what's *available* (on_hand - reserved).
   * Row-locked the same way as postMovement, so two orders racing to reserve
   * the last available units serialize correctly. Not currently logged to
   * stock_ledger (the ledger's quantity_in/out model tracks on_hand
   * movements, not reservation changes) — see docs/inventory-engine.md.
   */
  async reserveInTrx(
    trx: Transaction<Database>,
    organizationId: string,
    params: {
      productId: string;
      variantId?: string | null;
      warehouseId: string;
      locationId?: string | null;
      batchId?: string | null;
      quantity: number;
    },
  ) {
    const variantId = params.variantId ?? NIL_UUID;
    const locationId = params.locationId ?? NIL_UUID;
    const batchId = params.batchId ?? NIL_UUID;

    const balance = await this.lockOrCreateBalance(trx, organizationId, {
      productId: params.productId,
      variantId,
      warehouseId: params.warehouseId,
      locationId,
      batchId,
    });

    const available = Number(balance.on_hand) - Number(balance.reserved);
    if (params.quantity > available) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient available stock to reserve.',
      });
    }

    await trx
      .updateTable('stock_balances')
      .set({
        reserved: (Number(balance.reserved) + params.quantity).toString(),
        updated_at: sql`now()`,
      })
      .where('id', '=', balance.id)
      .execute();
  }

  async releaseInTrx(
    trx: Transaction<Database>,
    organizationId: string,
    params: {
      productId: string;
      variantId?: string | null;
      warehouseId: string;
      locationId?: string | null;
      batchId?: string | null;
      quantity: number;
    },
  ) {
    const variantId = params.variantId ?? NIL_UUID;
    const locationId = params.locationId ?? NIL_UUID;
    const batchId = params.batchId ?? NIL_UUID;

    const balance = await this.lockOrCreateBalance(trx, organizationId, {
      productId: params.productId,
      variantId,
      warehouseId: params.warehouseId,
      locationId,
      batchId,
    });

    const newReserved = Math.max(0, Number(balance.reserved) - params.quantity);
    await trx
      .updateTable('stock_balances')
      .set({ reserved: newReserved.toString(), updated_at: sql`now()` })
      .where('id', '=', balance.id)
      .execute();
  }

  async transfer(
    organizationId: string,
    userId: string | null,
    params: {
      productId: string;
      variantId?: string | null;
      batchId?: string | null;
      fromWarehouseId: string;
      fromLocationId?: string | null;
      toWarehouseId: string;
      toLocationId?: string | null;
      quantity: number;
      referenceType?: string | null;
      referenceId?: string | null;
      notes?: string | null;
    },
  ) {
    return this.db.transaction().execute(async (trx) => {
      const outLeg = await this.postMovementInTrx(trx, organizationId, userId, {
        productId: params.productId,
        variantId: params.variantId,
        batchId: params.batchId,
        warehouseId: params.fromWarehouseId,
        locationId: params.fromLocationId,
        transactionType: 'TRANSFER_OUT',
        quantityOut: params.quantity,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        notes: params.notes,
      });
      const inLeg = await this.postMovementInTrx(trx, organizationId, userId, {
        productId: params.productId,
        variantId: params.variantId,
        batchId: params.batchId,
        warehouseId: params.toWarehouseId,
        locationId: params.toLocationId,
        transactionType: 'TRANSFER_IN',
        quantityIn: params.quantity,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        notes: params.notes,
      });
      return { out: outLeg, in: inLeg };
    });
  }

  async listBalances(
    organizationId: string,
    filters: { warehouseId?: string; productId?: string; page: number; pageSize: number },
  ) {
    let builder = this.db
      .selectFrom('stock_balances as sb')
      .innerJoin('products as p', 'p.id', 'sb.product_id')
      .innerJoin('warehouses as w', 'w.id', 'sb.warehouse_id')
      .select([
        'sb.id',
        'sb.product_id',
        'p.sku',
        'p.name as product_name',
        'sb.warehouse_id',
        'w.name as warehouse_name',
        'sb.on_hand',
        'sb.reserved',
        'sb.updated_at',
        'p.reorder_point',
      ])
      .where('sb.organization_id', '=', organizationId);

    if (filters.warehouseId) builder = builder.where('sb.warehouse_id', '=', filters.warehouseId);
    if (filters.productId) builder = builder.where('sb.product_id', '=', filters.productId);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('p.name', 'asc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
      .execute();

    return { rows, total };
  }

  async listLedger(
    organizationId: string,
    filters: {
      productId?: string;
      warehouseId?: string;
      transactionType?: string;
      page: number;
      pageSize: number;
    },
  ) {
    let builder = this.db
      .selectFrom('stock_ledger')
      .selectAll()
      .where('organization_id', '=', organizationId);

    if (filters.productId) builder = builder.where('product_id', '=', filters.productId);
    if (filters.warehouseId) builder = builder.where('warehouse_id', '=', filters.warehouseId);
    if (filters.transactionType) builder = builder.where('transaction_type', '=', filters.transactionType);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('created_at', 'desc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
      .execute();

    return { rows, total };
  }
}
