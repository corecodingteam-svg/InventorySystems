import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { InventoryService } from '../inventory/inventory.service';
import { WorkflowService } from '../workflow/workflow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { paginate } from '../common/pagination/list-query.dto';
import { generateDocNumber } from '../common/generate-doc-number';
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
  PurchaseOrderListQueryDto,
} from './dto/purchasing.dto';

@Injectable()
export class PurchasingService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private inventoryService: InventoryService,
    private workflowService: WorkflowService,
    private notificationsService: NotificationsService,
    private webhooksService: WebhooksService,
  ) {}

  // ---- Purchase Orders ----

  async listPurchaseOrders(organizationId: string, query: PurchaseOrderListQueryDto) {
    let builder = this.db
      .selectFrom('purchase_orders as po')
      .innerJoin('suppliers as s', 's.id', 'po.supplier_id')
      .select([
        'po.id',
        'po.po_number',
        'po.status',
        'po.order_date',
        'po.expected_date',
        'po.supplier_id',
        's.name as supplier_name',
        'po.warehouse_id',
        'po.created_at',
      ])
      .where('po.organization_id', '=', organizationId);

    if (query.supplierId) builder = builder.where('po.supplier_id', '=', query.supplierId);
    if (query.status) builder = builder.where('po.status', '=', query.status);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('po.created_at', 'desc')
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
      .execute();

    return paginate(rows, total, query.page, query.pageSize);
  }

  async findPurchaseOrder(organizationId: string, id: string) {
    const po = await this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!po) throw new NotFoundException('Purchase order not found.');

    const items = await this.db
      .selectFrom('purchase_order_items as poi')
      .innerJoin('products as p', 'p.id', 'poi.product_id')
      .selectAll('poi')
      .select(['p.sku as product_sku', 'p.name as product_name'])
      .where('poi.organization_id', '=', organizationId)
      .where('poi.purchase_order_id', '=', id)
      .execute();

    return { ...po, items };
  }

  async createPurchaseOrder(organizationId: string, userId: string | null, dto: CreatePurchaseOrderDto) {
    return this.db.transaction().execute(async (trx) => {
      const po = await trx
        .insertInto('purchase_orders')
        .values({
          organization_id: organizationId,
          po_number: generateDocNumber('PO'),
          supplier_id: dto.supplierId,
          warehouse_id: dto.warehouseId,
          status: 'DRAFT',
          expected_date: dto.expectedDate ?? null,
          notes: dto.notes ?? null,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const items = await trx
        .insertInto('purchase_order_items')
        .values(
          dto.items.map((item) => ({
            organization_id: organizationId,
            purchase_order_id: po.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            quantity_ordered: item.quantity.toString(),
            unit_cost: item.unitCost.toString(),
          })),
        )
        .returningAll()
        .execute();

      return { ...po, items };
    });
  }

  async submitForApproval(organizationId: string, id: string) {
    return this.transitionStatus(organizationId, id, ['DRAFT'], 'PENDING_APPROVAL');
  }

  /**
   * Enforces the configurable amount-threshold rule (docs/workflow.md) on
   * top of the static `purchase.approve` permission the controller already
   * checked: a PO above a configured threshold needs whichever permission
   * that threshold's rule names (e.g. a higher "Finance approval" permission),
   * not just the baseline approve permission.
   */
  async approvePurchaseOrder(organizationId: string, userId: string | null, id: string) {
    const po = await this.db
      .selectFrom('purchase_orders')
      .select(['status', 'po_number'])
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!po) throw new NotFoundException('Purchase order not found.');
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(po.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot approve a purchase order in status ${po.status}.`,
      });
    }

    if (userId) {
      const items = await this.db
        .selectFrom('purchase_order_items')
        .select(['quantity_ordered', 'unit_cost'])
        .where('purchase_order_id', '=', id)
        .execute();
      const total = items.reduce((sum, i) => sum + Number(i.quantity_ordered) * Number(i.unit_cost), 0);

      const allowed = await this.workflowService.canApprovePurchaseOrder(organizationId, userId, total);
      if (!allowed) {
        throw new ForbiddenException({
          code: 'WORKFLOW_APPROVAL_REQUIRED',
          message: 'This purchase order exceeds a configured approval threshold and requires a higher-level approver.',
        });
      }
    }

    const updated = await this.db
      .updateTable('purchase_orders')
      .set({ status: 'APPROVED', approved_by: userId, approved_at: new Date() })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.notificationsService.create(organizationId, {
      type: 'PURCHASE_ORDER_APPROVED',
      title: 'Purchase order approved',
      message: `Purchase order ${po.po_number} has been approved.`,
      entityType: 'purchase_order',
      entityId: id,
    });
    await this.webhooksService.dispatch(organizationId, 'purchase.approved', { purchaseOrder: updated });

    return updated;
  }

  async cancelPurchaseOrder(organizationId: string, id: string) {
    const po = await this.db
      .selectFrom('purchase_orders')
      .select('status')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!po) throw new NotFoundException('Purchase order not found.');
    if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot cancel a purchase order in status ${po.status}.`,
      });
    }
    return this.db
      .updateTable('purchase_orders')
      .set({ status: 'CANCELLED' })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  private async transitionStatus(
    organizationId: string,
    id: string,
    fromAny: string[],
    to: string,
  ) {
    const po = await this.db
      .selectFrom('purchase_orders')
      .select('status')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!po) throw new NotFoundException('Purchase order not found.');
    if (!fromAny.includes(po.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move a purchase order from ${po.status} to ${to}.`,
      });
    }
    return this.db
      .updateTable('purchase_orders')
      .set({ status: to })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // ---- Goods Receipt ----

  async createGoodsReceipt(
    organizationId: string,
    userId: string | null,
    purchaseOrderId: string,
    dto: CreateGoodsReceiptDto,
  ) {
    return this.db.transaction().execute(async (trx) => {
      const po = await trx
        .selectFrom('purchase_orders')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .where('id', '=', purchaseOrderId)
        .executeTakeFirst();
      if (!po) throw new NotFoundException('Purchase order not found.');
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot receive against a purchase order in status ${po.status}. It must be approved first.`,
        });
      }

      const receipt = await trx
        .insertInto('goods_receipts')
        .values({
          organization_id: organizationId,
          purchase_order_id: purchaseOrderId,
          warehouse_id: po.warehouse_id,
          receipt_number: generateDocNumber('GR'),
          notes: dto.notes ?? null,
          received_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      for (const item of dto.items) {
        const poItem = await trx
          .selectFrom('purchase_order_items')
          .selectAll()
          .where('organization_id', '=', organizationId)
          .where('id', '=', item.purchaseOrderItemId)
          .where('purchase_order_id', '=', purchaseOrderId)
          .executeTakeFirst();
        if (!poItem) {
          throw new BadRequestException({
            code: 'INVALID_PO_ITEM',
            message: 'One of the goods receipt lines does not belong to this purchase order.',
          });
        }

        const remaining = Number(poItem.quantity_ordered) - Number(poItem.quantity_received);
        if (item.quantity > remaining) {
          throw new ConflictException({
            code: 'OVER_RECEIPT',
            message: `Cannot receive ${item.quantity} — only ${remaining} remain outstanding on this line.`,
          });
        }

        await trx
          .insertInto('goods_receipt_items')
          .values({
            organization_id: organizationId,
            goods_receipt_id: receipt.id,
            purchase_order_item_id: poItem.id,
            product_id: poItem.product_id,
            variant_id: poItem.variant_id,
            batch_id: item.batchId ?? null,
            quantity_received: item.quantity.toString(),
            unit_cost: poItem.unit_cost,
          })
          .execute();

        await trx
          .updateTable('purchase_order_items')
          .set({ quantity_received: (Number(poItem.quantity_received) + item.quantity).toString() })
          .where('id', '=', poItem.id)
          .execute();

        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: poItem.product_id,
          variantId: poItem.variant_id,
          warehouseId: po.warehouse_id,
          batchId: item.batchId,
          transactionType: 'PURCHASE_RECEIPT',
          quantityIn: item.quantity,
          unitCost: Number(poItem.unit_cost),
          referenceType: 'GOODS_RECEIPT',
          referenceId: receipt.id,
        });
      }

      const allItems = await trx
        .selectFrom('purchase_order_items')
        .selectAll()
        .where('purchase_order_id', '=', purchaseOrderId)
        .execute();
      const fullyReceived = allItems.every(
        (i) => Number(i.quantity_received) >= Number(i.quantity_ordered),
      );

      await trx
        .updateTable('purchase_orders')
        .set({ status: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' })
        .where('id', '=', purchaseOrderId)
        .execute();

      return receipt;
    });
  }

  // ---- Purchase Returns ----

  async createPurchaseReturn(organizationId: string, userId: string | null, dto: CreatePurchaseReturnDto) {
    return this.db.transaction().execute(async (trx) => {
      const purchaseReturn = await trx
        .insertInto('purchase_returns')
        .values({
          organization_id: organizationId,
          return_number: generateDocNumber('PR'),
          supplier_id: dto.supplierId,
          warehouse_id: dto.warehouseId,
          purchase_order_id: dto.purchaseOrderId ?? null,
          reason: dto.reason ?? null,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      for (const item of dto.items) {
        await trx
          .insertInto('purchase_return_items')
          .values({
            organization_id: organizationId,
            purchase_return_id: purchaseReturn.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            batch_id: item.batchId ?? null,
            quantity: item.quantity.toString(),
            unit_cost: item.unitCost.toString(),
          })
          .execute();

        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: dto.warehouseId,
          batchId: item.batchId,
          transactionType: 'RETURN_OUT',
          quantityOut: item.quantity,
          unitCost: item.unitCost,
          referenceType: 'PURCHASE_RETURN',
          referenceId: purchaseReturn.id,
        });
      }

      return purchaseReturn;
    });
  }
}
