import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { InventoryService } from '../inventory/inventory.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { paginate } from '../common/pagination/list-query.dto';
import { generateDocNumber } from '../common/generate-doc-number';
import {
  CreateDispatchDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
  SalesOrderListQueryDto,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private inventoryService: InventoryService,
    private webhooksService: WebhooksService,
  ) {}

  // ---- Sales Orders ----

  async listSalesOrders(organizationId: string, query: SalesOrderListQueryDto) {
    let builder = this.db
      .selectFrom('sales_orders as so')
      .innerJoin('customers as c', 'c.id', 'so.customer_id')
      .select([
        'so.id',
        'so.so_number',
        'so.status',
        'so.order_date',
        'so.customer_id',
        'c.name as customer_name',
        'so.warehouse_id',
        'so.created_at',
      ])
      .where('so.organization_id', '=', organizationId);

    if (query.customerId) builder = builder.where('so.customer_id', '=', query.customerId);
    if (query.status) builder = builder.where('so.status', '=', query.status);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('so.created_at', 'desc')
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
      .execute();

    return paginate(rows, total, query.page, query.pageSize);
  }

  async findSalesOrder(organizationId: string, id: string) {
    const so = await this.db
      .selectFrom('sales_orders')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!so) throw new NotFoundException('Sales order not found.');

    const items = await this.db
      .selectFrom('sales_order_items as soi')
      .innerJoin('products as p', 'p.id', 'soi.product_id')
      .selectAll('soi')
      .select(['p.sku as product_sku', 'p.name as product_name'])
      .where('soi.organization_id', '=', organizationId)
      .where('soi.sales_order_id', '=', id)
      .execute();

    return { ...so, items };
  }

  async createSalesOrder(organizationId: string, userId: string | null, dto: CreateSalesOrderDto) {
    return this.db.transaction().execute(async (trx) => {
      const so = await trx
        .insertInto('sales_orders')
        .values({
          organization_id: organizationId,
          so_number: generateDocNumber('SO'),
          customer_id: dto.customerId,
          warehouse_id: dto.warehouseId,
          status: 'DRAFT',
          notes: dto.notes ?? null,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const items = await trx
        .insertInto('sales_order_items')
        .values(
          dto.items.map((item) => ({
            organization_id: organizationId,
            sales_order_id: so.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            quantity_ordered: item.quantity.toString(),
            unit_price: item.unitPrice.toString(),
          })),
        )
        .returningAll()
        .execute();

      return { ...so, items };
    });
  }

  /** DRAFT -> CONFIRMED, reserving stock for every line. Rolls back entirely if any line can't be reserved. */
  async confirmSalesOrder(organizationId: string, userId: string | null, id: string) {
    return this.db.transaction().execute(async (trx) => {
      const so = await trx
        .selectFrom('sales_orders')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .where('id', '=', id)
        .executeTakeFirst();
      if (!so) throw new NotFoundException('Sales order not found.');
      if (so.status !== 'DRAFT') {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot confirm a sales order in status ${so.status}.`,
        });
      }

      const items = await trx
        .selectFrom('sales_order_items')
        .selectAll()
        .where('sales_order_id', '=', id)
        .execute();

      for (const item of items) {
        await this.inventoryService.reserveInTrx(trx, organizationId, {
          productId: item.product_id,
          variantId: item.variant_id,
          warehouseId: so.warehouse_id,
          quantity: Number(item.quantity_ordered),
        });
        await trx
          .updateTable('sales_order_items')
          .set({ quantity_reserved: item.quantity_ordered })
          .where('id', '=', item.id)
          .execute();
      }

      return trx
        .updateTable('sales_orders')
        .set({ status: 'CONFIRMED', confirmed_by: userId, confirmed_at: new Date() })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  /** Releases any un-dispatched reservation and marks the order CANCELLED. */
  async cancelSalesOrder(organizationId: string, id: string) {
    return this.db.transaction().execute(async (trx) => {
      const so = await trx
        .selectFrom('sales_orders')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .where('id', '=', id)
        .executeTakeFirst();
      if (!so) throw new NotFoundException('Sales order not found.');
      if (['DISPATCHED', 'CANCELLED'].includes(so.status)) {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot cancel a sales order in status ${so.status}.`,
        });
      }

      const items = await trx
        .selectFrom('sales_order_items')
        .selectAll()
        .where('sales_order_id', '=', id)
        .execute();

      for (const item of items) {
        const stillReserved = Number(item.quantity_reserved) - Number(item.quantity_dispatched);
        if (stillReserved > 0) {
          await this.inventoryService.releaseInTrx(trx, organizationId, {
            productId: item.product_id,
            variantId: item.variant_id,
            warehouseId: so.warehouse_id,
            quantity: stillReserved,
          });
        }
      }

      return trx
        .updateTable('sales_orders')
        .set({ status: 'CANCELLED' })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  // ---- Dispatch ----

  async createDispatch(
    organizationId: string,
    userId: string | null,
    salesOrderId: string,
    dto: CreateDispatchDto,
  ) {
    const dispatch = await this.db.transaction().execute(async (trx) => {
      const so = await trx
        .selectFrom('sales_orders')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .where('id', '=', salesOrderId)
        .executeTakeFirst();
      if (!so) throw new NotFoundException('Sales order not found.');
      if (!['CONFIRMED', 'PARTIALLY_DISPATCHED'].includes(so.status)) {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot dispatch a sales order in status ${so.status}. It must be confirmed first.`,
        });
      }

      const dispatch = await trx
        .insertInto('sales_dispatches')
        .values({
          organization_id: organizationId,
          sales_order_id: salesOrderId,
          warehouse_id: so.warehouse_id,
          dispatch_number: generateDocNumber('DSP'),
          notes: dto.notes ?? null,
          dispatched_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      for (const item of dto.items) {
        const soItem = await trx
          .selectFrom('sales_order_items')
          .selectAll()
          .where('organization_id', '=', organizationId)
          .where('id', '=', item.salesOrderItemId)
          .where('sales_order_id', '=', salesOrderId)
          .executeTakeFirst();
        if (!soItem) {
          throw new BadRequestException({
            code: 'INVALID_SO_ITEM',
            message: 'One of the dispatch lines does not belong to this sales order.',
          });
        }

        const remaining = Number(soItem.quantity_reserved) - Number(soItem.quantity_dispatched);
        if (item.quantity > remaining) {
          throw new ConflictException({
            code: 'OVER_DISPATCH',
            message: `Cannot dispatch ${item.quantity} — only ${remaining} remain reserved on this line.`,
          });
        }

        await trx
          .insertInto('sales_dispatch_items')
          .values({
            organization_id: organizationId,
            sales_dispatch_id: dispatch.id,
            sales_order_item_id: soItem.id,
            product_id: soItem.product_id,
            variant_id: soItem.variant_id,
            batch_id: item.batchId ?? null,
            quantity: item.quantity.toString(),
            unit_price: soItem.unit_price,
          })
          .execute();

        await trx
          .updateTable('sales_order_items')
          .set({ quantity_dispatched: (Number(soItem.quantity_dispatched) + item.quantity).toString() })
          .where('id', '=', soItem.id)
          .execute();

        // Fulfilling a reservation: on_hand actually leaves (SALES_ISSUE)
        // and the matching amount of `reserved` is released in the same
        // transaction, so the two never drift apart.
        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: soItem.product_id,
          variantId: soItem.variant_id,
          warehouseId: so.warehouse_id,
          batchId: item.batchId,
          transactionType: 'SALES_ISSUE',
          quantityOut: item.quantity,
          unitCost: Number(soItem.unit_price),
          referenceType: 'SALES_DISPATCH',
          referenceId: dispatch.id,
        });
        await this.inventoryService.releaseInTrx(trx, organizationId, {
          productId: soItem.product_id,
          variantId: soItem.variant_id,
          warehouseId: so.warehouse_id,
          quantity: item.quantity,
        });
      }

      const allItems = await trx
        .selectFrom('sales_order_items')
        .selectAll()
        .where('sales_order_id', '=', salesOrderId)
        .execute();
      const fullyDispatched = allItems.every(
        (i) => Number(i.quantity_dispatched) >= Number(i.quantity_ordered),
      );

      await trx
        .updateTable('sales_orders')
        .set({ status: fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED' })
        .where('id', '=', salesOrderId)
        .execute();

      return dispatch;
    });

    await this.webhooksService.dispatch(organizationId, 'sales.dispatched', { dispatch });
    return dispatch;
  }

  // ---- Sales Returns ----

  async createSalesReturn(organizationId: string, userId: string | null, dto: CreateSalesReturnDto) {
    return this.db.transaction().execute(async (trx) => {
      const salesReturn = await trx
        .insertInto('sales_returns')
        .values({
          organization_id: organizationId,
          return_number: generateDocNumber('SR'),
          customer_id: dto.customerId,
          warehouse_id: dto.warehouseId,
          sales_order_id: dto.salesOrderId ?? null,
          reason: dto.reason ?? null,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      for (const item of dto.items) {
        await trx
          .insertInto('sales_return_items')
          .values({
            organization_id: organizationId,
            sales_return_id: salesReturn.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            batch_id: item.batchId ?? null,
            quantity: item.quantity.toString(),
            unit_price: item.unitPrice.toString(),
          })
          .execute();

        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: dto.warehouseId,
          batchId: item.batchId,
          transactionType: 'RETURN_IN',
          quantityIn: item.quantity,
          unitCost: item.unitPrice,
          referenceType: 'SALES_RETURN',
          referenceId: salesReturn.id,
        });
      }

      return salesReturn;
    });
  }
}
