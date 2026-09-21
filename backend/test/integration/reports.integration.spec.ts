/**
 * Integration test against a REAL PostgreSQL instance for the reporting
 * aggregations, which run raw SQL sums/joins that Kysely's type system
 * accepts but can still be wrong (join fan-out, wrong date column, etc.) —
 * only a real query against real data catches that. See
 * inventory.integration.spec.ts for setup notes.
 * Requires: `docker compose up -d postgres`, `npm run migrate:up`, then
 * `RUN_INTEGRATION_TESTS=1 npm test`.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { PurchasingService } from '../../src/purchasing/purchasing.service';
import { SalesService } from '../../src/sales/sales.service';
import { ReportsService } from '../../src/reports/reports.service';
import { WorkflowService } from '../../src/workflow/workflow.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { WebhooksService } from '../../src/webhooks/webhooks.service';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('ReportsService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let inventoryService: InventoryService;
  let purchasingService: PurchasingService;
  let salesService: SalesService;
  let reportsService: ReportsService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let supplierId: string;
  let customerId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    inventoryService = new InventoryService(db);
    const notificationsService = new NotificationsService(db);
    const webhooksService = new WebhooksService(db);
    purchasingService = new PurchasingService(
      db,
      inventoryService,
      new WorkflowService(db),
      notificationsService,
      webhooksService,
    );
    salesService = new SalesService(db, inventoryService, webhooksService);
    reportsService = new ReportsService(db, notificationsService, webhooksService);

    const org = await db
      .insertInto('organizations')
      .values({ name: 'Test Org', slug: `test-org-${uuid()}`, status: 'active' })
      .returningAll()
      .executeTakeFirstOrThrow();
    orgId = org.id;

    const unit = await db
      .insertInto('units')
      .values({ organization_id: orgId, name: 'Piece', code: 'PCS' })
      .returningAll()
      .executeTakeFirstOrThrow();

    warehouseId = (
      await db
        .insertInto('warehouses')
        .values({ organization_id: orgId, name: 'Main', code: 'MAIN' })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    productId = (
      await db
        .insertInto('products')
        .values({
          organization_id: orgId,
          sku: `SKU-${uuid()}`,
          name: 'Test Product',
          base_unit_id: unit.id,
          cost_price: '10',
          reorder_point: '50',
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    supplierId = (
      await db
        .insertInto('suppliers')
        .values({ organization_id: orgId, name: 'Test Supplier', code: `SUP-${uuid().slice(0, 8)}` })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    customerId = (
      await db
        .insertInto('customers')
        .values({ organization_id: orgId, name: 'Test Customer', code: `CUST-${uuid().slice(0, 8)}` })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('reflects procurement and sales activity in dashboard, valuation, and by-product/by-supplier reports', async () => {
    const po = await purchasingService.createPurchaseOrder(orgId, null, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 30, unitCost: 10 }],
    });
    await purchasingService.approvePurchaseOrder(orgId, null, po.id);
    await purchasingService.createGoodsReceipt(orgId, null, po.id, {
      items: [{ purchaseOrderItemId: po.items[0].id, quantity: 30 }],
    });

    const so = await salesService.createSalesOrder(orgId, null, {
      customerId,
      warehouseId,
      items: [{ productId, quantity: 10, unitPrice: 25 }],
    });
    await salesService.confirmSalesOrder(orgId, null, so.id);
    await salesService.createDispatch(orgId, null, so.id, {
      items: [{ salesOrderItemId: so.items[0].id, quantity: 10 }],
    });

    // 30 received - 10 dispatched = 20 on hand, below the 50 reorder point.
    const dashboard = await reportsService.dashboardSummary(orgId);
    expect(dashboard.lowStockCount).toBeGreaterThanOrEqual(1);
    expect(dashboard.inventoryValue).toBeGreaterThanOrEqual(200); // 20 * cost_price 10

    const valuation = await reportsService.stockValuation(orgId, { page: 1, pageSize: 25 });
    const productRow = valuation.data.find((r: any) => r.product_id === productId);
    expect(productRow).toBeTruthy();
    expect(Number((productRow as any).on_hand)).toBe(20);

    const byProduct = await reportsService.salesByProduct(orgId);
    const productSales = byProduct.find((r) => r.product_id === productId);
    expect(productSales?.total_quantity).toBe(10);
    expect(productSales?.total_revenue).toBe(250);

    const bySupplier = await reportsService.purchasesBySupplier(orgId);
    const supplierSpend = bySupplier.find((r) => r.supplier_id === supplierId);
    expect(supplierSpend?.total_quantity).toBe(30);
    expect(supplierSpend?.total_spend).toBe(300);
  });
});
