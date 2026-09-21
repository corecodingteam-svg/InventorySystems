import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { KYSELY, Db } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { paginate } from '../common/pagination/list-query.dto';
import { StockValuationQueryDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private notificationsService: NotificationsService,
    private webhooksService: WebhooksService,
  ) {}

  /** Role-agnostic top-level counters — see docs/reports.md for what each of these means and who reads them. */
  async dashboardSummary(organizationId: string) {
    const [
      productCount,
      warehouseCount,
      lowStock,
      outOfStock,
      pendingPurchaseOrders,
      pendingSalesOrders,
      valuationRow,
    ] = await Promise.all([
      this.db
        .selectFrom('products')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organization_id', '=', organizationId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
      this.db
        .selectFrom('warehouses')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organization_id', '=', organizationId)
        .executeTakeFirst(),
      this.lowStockCount(organizationId),
      this.db
        .selectFrom('stock_balances as sb')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('sb.organization_id', '=', organizationId)
        .where('sb.on_hand', '=', '0')
        .executeTakeFirst(),
      this.db
        .selectFrom('purchase_orders')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organization_id', '=', organizationId)
        .where('status', 'in', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'])
        .executeTakeFirst(),
      this.db
        .selectFrom('sales_orders')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organization_id', '=', organizationId)
        .where('status', 'in', ['DRAFT', 'CONFIRMED', 'PARTIALLY_DISPATCHED'])
        .executeTakeFirst(),
      this.db
        .selectFrom('stock_balances as sb')
        .innerJoin('products as p', 'p.id', 'sb.product_id')
        .select(() => sql<number>`sum(sb.on_hand * p.cost_price)`.as('value'))
        .where('sb.organization_id', '=', organizationId)
        .executeTakeFirst(),
    ]);

    return {
      totalProducts: Number(productCount?.count ?? 0),
      totalWarehouses: Number(warehouseCount?.count ?? 0),
      lowStockCount: lowStock,
      outOfStockCount: Number(outOfStock?.count ?? 0),
      pendingPurchaseOrders: Number(pendingPurchaseOrders?.count ?? 0),
      pendingSalesOrders: Number(pendingSalesOrders?.count ?? 0),
      inventoryValue: Number((valuationRow as any)?.value ?? 0),
    };
  }

  private async lowStockCount(organizationId: string): Promise<number> {
    const rows = await this.db
      .selectFrom('stock_balances as sb')
      .innerJoin('products as p', 'p.id', 'sb.product_id')
      .select(['sb.product_id', 'sb.on_hand', 'p.reorder_point'])
      .where('sb.organization_id', '=', organizationId)
      .where('p.reorder_point', '>', '0')
      .execute();

    const totals = new Map<string, { onHand: number; reorderPoint: number }>();
    for (const row of rows) {
      const entry = totals.get(row.product_id) ?? { onHand: 0, reorderPoint: Number(row.reorder_point) };
      entry.onHand += Number(row.on_hand);
      totals.set(row.product_id, entry);
    }
    return [...totals.values()].filter((t) => t.onHand <= t.reorderPoint).length;
  }

  /** Products at or below their reorder point (summed across all warehouses). */
  async lowStockReport(organizationId: string) {
    const rows = await this.db
      .selectFrom('stock_balances as sb')
      .innerJoin('products as p', 'p.id', 'sb.product_id')
      .select(['sb.product_id', 'p.sku', 'p.name', 'p.reorder_point', 'sb.on_hand'])
      .where('sb.organization_id', '=', organizationId)
      .where('p.reorder_point', '>', '0')
      .execute();

    const byProduct = new Map<string, { sku: string; name: string; onHand: number; reorderPoint: number }>();
    for (const row of rows) {
      const entry = byProduct.get(row.product_id) ?? {
        sku: row.sku,
        name: row.name,
        onHand: 0,
        reorderPoint: Number(row.reorder_point),
      };
      entry.onHand += Number(row.on_hand);
      byProduct.set(row.product_id, entry);
    }

    return [...byProduct.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .filter((v) => v.onHand <= v.reorderPoint)
      .sort((a, b) => a.onHand - a.reorderPoint - (b.onHand - b.reorderPoint));
  }

  /** Current stock value per product/warehouse slot: on_hand * cost_price. */
  async stockValuation(organizationId: string, query: StockValuationQueryDto) {
    let builder = this.db
      .selectFrom('stock_balances as sb')
      .innerJoin('products as p', 'p.id', 'sb.product_id')
      .innerJoin('warehouses as w', 'w.id', 'sb.warehouse_id')
      .select([
        'sb.product_id',
        'p.sku',
        'p.name as product_name',
        'sb.warehouse_id',
        'w.name as warehouse_name',
        'sb.on_hand',
        'p.cost_price',
      ])
      .where('sb.organization_id', '=', organizationId)
      .where('sb.on_hand', '>', '0');

    if (query.warehouseId) builder = builder.where('sb.warehouse_id', '=', query.warehouseId);

    const all = await builder.execute();
    const rows = all
      .map((r) => ({ ...r, value: Number(r.on_hand) * Number(r.cost_price) }))
      .sort((a, b) => b.value - a.value);
    const total = rows.length;
    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
    const page = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);

    return { ...paginate(page, total, query.page, query.pageSize), totalValue };
  }

  /** Sales quantity/revenue grouped by product, from actual dispatches (what physically shipped). */
  async salesByProduct(organizationId: string, dateFrom?: string, dateTo?: string) {
    let builder = this.db
      .selectFrom('sales_dispatch_items as sdi')
      .innerJoin('sales_dispatches as sd', 'sd.id', 'sdi.sales_dispatch_id')
      .innerJoin('products as p', 'p.id', 'sdi.product_id')
      .select([
        'sdi.product_id',
        'p.sku',
        'p.name as product_name',
        (eb) => eb.fn.sum('sdi.quantity').as('total_quantity'),
        () => sql<number>`sum(sdi.quantity * sdi.unit_price)`.as('total_revenue'),
      ])
      .where('sdi.organization_id', '=', organizationId)
      .groupBy(['sdi.product_id', 'p.sku', 'p.name']);

    if (dateFrom) builder = builder.where(sql<boolean>`sd.dispatched_at >= ${dateFrom}`);
    if (dateTo) builder = builder.where(sql<boolean>`sd.dispatched_at <= ${dateTo}`);

    const rows = await builder.execute();
    return rows
      .map((r) => ({ ...r, total_quantity: Number(r.total_quantity), total_revenue: Number(r.total_revenue) }))
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }

  /** Sales revenue grouped by customer. */
  async salesByCustomer(organizationId: string, dateFrom?: string, dateTo?: string) {
    let builder = this.db
      .selectFrom('sales_dispatch_items as sdi')
      .innerJoin('sales_dispatches as sd', 'sd.id', 'sdi.sales_dispatch_id')
      .innerJoin('sales_orders as so', 'so.id', 'sd.sales_order_id')
      .innerJoin('customers as c', 'c.id', 'so.customer_id')
      .select([
        'so.customer_id',
        'c.name as customer_name',
        (eb) => eb.fn.sum('sdi.quantity').as('total_quantity'),
        () => sql<number>`sum(sdi.quantity * sdi.unit_price)`.as('total_revenue'),
      ])
      .where('sdi.organization_id', '=', organizationId)
      .groupBy(['so.customer_id', 'c.name']);

    if (dateFrom) builder = builder.where(sql<boolean>`sd.dispatched_at >= ${dateFrom}`);
    if (dateTo) builder = builder.where(sql<boolean>`sd.dispatched_at <= ${dateTo}`);

    const rows = await builder.execute();
    return rows
      .map((r) => ({ ...r, total_quantity: Number(r.total_quantity), total_revenue: Number(r.total_revenue) }))
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }

  /** Purchase spend grouped by supplier, from actual goods receipts. */
  async purchasesBySupplier(organizationId: string, dateFrom?: string, dateTo?: string) {
    let builder = this.db
      .selectFrom('goods_receipt_items as gri')
      .innerJoin('goods_receipts as gr', 'gr.id', 'gri.goods_receipt_id')
      .innerJoin('purchase_orders as po', 'po.id', 'gr.purchase_order_id')
      .innerJoin('suppliers as s', 's.id', 'po.supplier_id')
      .select([
        'po.supplier_id',
        's.name as supplier_name',
        (eb) => eb.fn.sum('gri.quantity_received').as('total_quantity'),
        () => sql<number>`sum(gri.quantity_received * gri.unit_cost)`.as('total_spend'),
      ])
      .where('gri.organization_id', '=', organizationId)
      .groupBy(['po.supplier_id', 's.name']);

    if (dateFrom) builder = builder.where(sql<boolean>`gr.received_at >= ${dateFrom}`);
    if (dateTo) builder = builder.where(sql<boolean>`gr.received_at <= ${dateTo}`);

    const rows = await builder.execute();
    return rows
      .map((r) => ({ ...r, total_quantity: Number(r.total_quantity), total_spend: Number(r.total_spend) }))
      .sort((a, b) => b.total_spend - a.total_spend);
  }

  /** Stock movement summary per warehouse over a date range — receipts, dispatches, transfers, adjustments. */
  async warehouseActivity(organizationId: string, dateFrom?: string, dateTo?: string) {
    let builder = this.db
      .selectFrom('stock_ledger as sl')
      .innerJoin('warehouses as w', 'w.id', 'sl.warehouse_id')
      .select([
        'sl.warehouse_id',
        'w.name as warehouse_name',
        'sl.transaction_type',
        (eb) => eb.fn.sum('sl.quantity_in').as('total_in'),
        (eb) => eb.fn.sum('sl.quantity_out').as('total_out'),
      ])
      .where('sl.organization_id', '=', organizationId)
      .groupBy(['sl.warehouse_id', 'w.name', 'sl.transaction_type']);

    if (dateFrom) builder = builder.where(sql<boolean>`sl.created_at >= ${dateFrom}`);
    if (dateTo) builder = builder.where(sql<boolean>`sl.created_at <= ${dateTo}`);

    const rows = await builder.execute();
    return rows.map((r) => ({ ...r, total_in: Number(r.total_in), total_out: Number(r.total_out) }));
  }

  /**
   * Reorder recommendations (master spec §30): average daily usage over the
   * trailing window, projected against lead time plus a safety-stock
   * buffer. This only ever *suggests* a quantity — nothing here places a
   * purchase order automatically, per the spec's explicit instruction not
   * to auto-order. See docs/forecasting.md.
   */
  async reorderForecast(
    organizationId: string,
    params: { windowDays: number; leadTimeDays: number; safetyStockDays: number },
  ) {
    const since = new Date();
    since.setDate(since.getDate() - params.windowDays);

    const usageRows = await this.db
      .selectFrom('stock_ledger')
      .select(['product_id', (eb) => eb.fn.sum('quantity_out').as('total_out')])
      .where('organization_id', '=', organizationId)
      .where('transaction_type', '=', 'SALES_ISSUE')
      .where(sql<boolean>`created_at >= ${since.toISOString()}`)
      .groupBy('product_id')
      .execute();
    const usageByProduct = new Map(usageRows.map((r) => [r.product_id, Number(r.total_out)]));

    const products = await this.db
      .selectFrom('products')
      .select(['id', 'sku', 'name', 'reorder_point'])
      .where('organization_id', '=', organizationId)
      .where('deleted_at', 'is', null)
      .execute();

    const onHandRows = await this.db
      .selectFrom('stock_balances')
      .select(['product_id', (eb) => eb.fn.sum('on_hand').as('total_on_hand')])
      .where('organization_id', '=', organizationId)
      .groupBy('product_id')
      .execute();
    const onHandByProduct = new Map(onHandRows.map((r) => [r.product_id, Number(r.total_on_hand)]));

    return products
      .map((p) => {
        const totalUsed = usageByProduct.get(p.id) ?? 0;
        const avgDailyUsage = totalUsed / params.windowDays;
        const onHand = onHandByProduct.get(p.id) ?? 0;
        const safetyStock = avgDailyUsage * params.safetyStockDays;
        const reorderPoint = avgDailyUsage * params.leadTimeDays + safetyStock;
        const suggestedQuantity = Math.max(0, Math.ceil(reorderPoint - onHand));
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          avgDailyUsage: Number(avgDailyUsage.toFixed(2)),
          onHand,
          computedReorderPoint: Number(reorderPoint.toFixed(2)),
          configuredReorderPoint: Number(p.reorder_point),
          suggestedOrderQuantity: suggestedQuantity,
        };
      })
      .filter((p) => p.avgDailyUsage > 0 || p.suggestedOrderQuantity > 0)
      .sort((a, b) => b.suggestedOrderQuantity - a.suggestedOrderQuantity);
  }

  /**
   * Triggered manually today (no background scheduler is wired yet — see
   * docs/notifications.md); posts one organization-wide broadcast
   * notification summarizing everything currently below its reorder point,
   * rather than one notification per product.
   */
  async notifyLowStock(organizationId: string) {
    const lowStock = await this.lowStockReport(organizationId);
    if (lowStock.length === 0) return { notified: false, count: 0 };

    await this.notificationsService.create(organizationId, {
      type: 'LOW_STOCK',
      title: `${lowStock.length} product${lowStock.length === 1 ? '' : 's'} low on stock`,
      message: lowStock
        .slice(0, 10)
        .map((p) => `${p.sku}: ${p.onHand} on hand (reorder at ${p.reorderPoint})`)
        .join('; '),
    });
    await this.webhooksService.dispatch(organizationId, 'inventory.low_stock', { products: lowStock });
    return { notified: true, count: lowStock.length };
  }
}
