/**
 * Integration test against a REAL PostgreSQL instance for the configurable
 * purchase-approval workflow threshold: a PO above a configured amount
 * should require whichever permission the matching rule names, not just the
 * baseline purchase.approve permission the controller guard already checked.
 * See inventory.integration.spec.ts for setup notes.
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

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('Purchase approval workflow (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let purchasingService: PurchasingService;
  let workflowService: WorkflowService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let supplierId: string;
  let approverUserId: string;
  let financeUserId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    const inventoryService = new InventoryService(db);
    workflowService = new WorkflowService(db);
    purchasingService = new PurchasingService(
      db,
      inventoryService,
      workflowService,
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

    // Two users: one with only the baseline purchase.approve permission,
    // one with a "finance.approve" permission the high-value rule requires.
    const approveRole = await db
      .insertInto('roles')
      .values({ organization_id: orgId, name: 'Manager', is_system: false })
      .returningAll()
      .executeTakeFirstOrThrow();
    const approvePermission = await db
      .selectFrom('permissions')
      .select('id')
      .where('code', '=', 'purchase.approve')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('role_permissions')
      .values({ role_id: approveRole.id, permission_id: approvePermission.id })
      .execute();

    approverUserId = (
      await db
        .insertInto('users')
        .values({
          organization_id: orgId,
          email: `manager-${uuid()}@example.com`,
          password_hash: 'x',
          full_name: 'Manager',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;
    await db.insertInto('user_roles').values({ user_id: approverUserId, role_id: approveRole.id }).execute();

    const financePermission = await db
      .insertInto('permissions')
      .values({ code: `finance.approve.${uuid().slice(0, 8)}`, description: 'Finance-level PO approval' })
      .returningAll()
      .executeTakeFirstOrThrow();
    const financeRole = await db
      .insertInto('roles')
      .values({ organization_id: orgId, name: 'Finance', is_system: false })
      .returningAll()
      .executeTakeFirstOrThrow();
    await db
      .insertInto('role_permissions')
      .values([
        { role_id: financeRole.id, permission_id: financePermission.id },
        { role_id: financeRole.id, permission_id: approvePermission.id },
      ])
      .execute();
    financeUserId = (
      await db
        .insertInto('users')
        .values({
          organization_id: orgId,
          email: `finance-${uuid()}@example.com`,
          password_hash: 'x',
          full_name: 'Finance Approver',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;
    await db.insertInto('user_roles').values({ user_id: financeUserId, role_id: financeRole.id }).execute();

    await workflowService.createPurchaseApprovalRule(orgId, {
      name: 'High-value PO requires Finance',
      minAmount: 100000,
      requiredPermission: financePermission.code,
    });
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('lets a manager approve a low-value PO but not a high-value one, and lets finance approve the high-value one', async () => {
    const lowValuePo = await purchasingService.createPurchaseOrder(orgId, approverUserId, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 10, unitCost: 100 }], // total 1,000 — below threshold
    });
    const approved = await purchasingService.approvePurchaseOrder(orgId, approverUserId, lowValuePo.id);
    expect(approved.status).toBe('APPROVED');

    const highValuePo = await purchasingService.createPurchaseOrder(orgId, approverUserId, {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 2000, unitCost: 100 }], // total 200,000 — above threshold
    });

    await expect(
      purchasingService.approvePurchaseOrder(orgId, approverUserId, highValuePo.id),
    ).rejects.toThrow('exceeds a configured approval threshold');

    const stillPending = await purchasingService.findPurchaseOrder(orgId, highValuePo.id);
    expect(stillPending.status).not.toBe('APPROVED');

    const financeApproved = await purchasingService.approvePurchaseOrder(orgId, financeUserId, highValuePo.id);
    expect(financeApproved.status).toBe('APPROVED');
  });
});
