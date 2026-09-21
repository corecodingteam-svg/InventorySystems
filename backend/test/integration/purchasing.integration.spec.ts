/**
 * Integration test against a REAL PostgreSQL instance for the procurement
 * flow: PO -> approve -> goods receipt -> stock increases -> purchase return
 * -> stock decreases. See inventory.integration.spec.ts for setup notes.
 * Requires: `docker compose up -d postgres`, `npm run migrate:up`, then
 * `RUN_INTEGRATION_TESTS=1 npm test`.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { PurchasingService } from '../../src/purchasing/purchasing.service';
import { WorkflowService } from '../../src/workflow/workflow.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { NIL_UUID } from '../../src/common/constants';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('PurchasingService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let inventoryService: InventoryService;
  let purchasingService: PurchasingService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let supplierId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    inventoryService = new InventoryService(db);
    purchasingService = new PurchasingService(
      db,
      inventoryService,
      new WorkflowService(db),
      new NotificationsService(db),
      new WebhooksService(db),
    );

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
        .values({ organization_id: orgId, sku: `SKU-${uuid()}`, name: 'Test Product', base_unit_id: unit.id })
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
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('increases stock on goods receipt and decreases it on purchase return', async () => {
    const po = await purchasingService.createPurchaseOrder(orgId, null, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 50, unitCost: 10 }],
    });

    await purchasingService.approvePurchaseOrder(orgId, null, po.id);

    await purchasingService.createGoodsReceipt(orgId, null, po.id, {
      items: [{ purchaseOrderItemId: po.items[0].id, quantity: 50 }],
    });

    const afterReceipt = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterReceipt.on_hand)).toBe(50);

    const poAfter = await purchasingService.findPurchaseOrder(orgId, po.id);
    expect(poAfter.status).toBe('RECEIVED');

    await purchasingService.createPurchaseReturn(orgId, null, {
      supplierId,
      warehouseId,
      purchaseOrderId: po.id,
      items: [{ productId, quantity: 5, unitCost: 10 }],
    });

    const afterReturn = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterReturn.on_hand)).toBe(45);
  });

  it('rejects a goods receipt that exceeds the ordered quantity', async () => {
    const po = await purchasingService.createPurchaseOrder(orgId, null, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 10, unitCost: 10 }],
    });
    await purchasingService.approvePurchaseOrder(orgId, null, po.id);

    await expect(
      purchasingService.createGoodsReceipt(orgId, null, po.id, {
        items: [{ purchaseOrderItemId: po.items[0].id, quantity: 11 }],
      }),
    ).rejects.toThrow('only 10 remain outstanding');
  });

  it('marks a partially received PO as PARTIALLY_RECEIVED, not RECEIVED', async () => {
    const po = await purchasingService.createPurchaseOrder(orgId, null, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 20, unitCost: 10 }],
    });
    await purchasingService.approvePurchaseOrder(orgId, null, po.id);

    await purchasingService.createGoodsReceipt(orgId, null, po.id, {
      items: [{ purchaseOrderItemId: po.items[0].id, quantity: 8 }],
    });

    const poAfter = await purchasingService.findPurchaseOrder(orgId, po.id);
    expect(poAfter.status).toBe('PARTIALLY_RECEIVED');
  });
});
