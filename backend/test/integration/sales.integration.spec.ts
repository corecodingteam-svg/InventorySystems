/**
 * Integration test against a REAL PostgreSQL instance for the sales flow:
 * SO -> confirm (reserve stock) -> dispatch (fulfil reservation, decrease
 * on_hand) -> sales return (increase stock back). Also proves reservation
 * is row-locked the same way postMovement is, so two orders racing for the
 * last available units can't both reserve more than exists. See
 * inventory.integration.spec.ts for setup notes.
 * Requires: `docker compose up -d postgres`, `npm run migrate:up`, then
 * `RUN_INTEGRATION_TESTS=1 npm test`.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { SalesService } from '../../src/sales/sales.service';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { NIL_UUID } from '../../src/common/constants';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('SalesService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let inventoryService: InventoryService;
  let salesService: SalesService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    inventoryService = new InventoryService(db);
    salesService = new SalesService(db, inventoryService, new WebhooksService(db));

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

    customerId = (
      await db
        .insertInto('customers')
        .values({ organization_id: orgId, name: 'Test Customer', code: `CUST-${uuid().slice(0, 8)}` })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    await inventoryService.postMovement(orgId, null, {
      productId,
      warehouseId,
      transactionType: 'OPENING_STOCK',
      quantityIn: 100,
    });
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('reserves stock on confirm, decreases on_hand on dispatch, and restores it on return', async () => {
    const so = await salesService.createSalesOrder(orgId, null, {
      customerId,
      warehouseId,
      items: [{ productId, quantity: 20, unitPrice: 15 }],
    });

    await salesService.confirmSalesOrder(orgId, null, so.id);

    const afterConfirm = await db
      .selectFrom('stock_balances')
      .selectAll()
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterConfirm.on_hand)).toBe(100); // confirm only reserves — on_hand is untouched
    expect(Number(afterConfirm.reserved)).toBe(20);

    await salesService.createDispatch(orgId, null, so.id, {
      items: [{ salesOrderItemId: so.items[0].id, quantity: 20 }],
    });

    const afterDispatch = await db
      .selectFrom('stock_balances')
      .selectAll()
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterDispatch.reserved)).toBe(0);

    const soAfter = await salesService.findSalesOrder(orgId, so.id);
    expect(soAfter.status).toBe('DISPATCHED');

    const onHandAfterDispatch = Number(afterDispatch.on_hand);

    await salesService.createSalesReturn(orgId, null, {
      customerId,
      warehouseId,
      salesOrderId: so.id,
      items: [{ productId, quantity: 3, unitPrice: 15 }],
    });

    const afterReturn = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterReturn.on_hand)).toBe(onHandAfterDispatch + 3);
  });

  it('does not allow two concurrent order confirmations to over-reserve the last units', async () => {
    const localProductId = (
      await db
        .insertInto('products')
        .values({
          organization_id: orgId,
          sku: `SKU-RESERVE-${uuid()}`,
          name: 'Reservation Test Product',
          base_unit_id: (
            await db.selectFrom('units').select('id').where('organization_id', '=', orgId).executeTakeFirstOrThrow()
          ).id,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    await inventoryService.postMovement(orgId, null, {
      productId: localProductId,
      warehouseId,
      transactionType: 'OPENING_STOCK',
      quantityIn: 5,
    });

    const [soA, soB] = await Promise.all([
      salesService.createSalesOrder(orgId, null, {
        customerId,
        warehouseId,
        items: [{ productId: localProductId, quantity: 5, unitPrice: 10 }],
      }),
      salesService.createSalesOrder(orgId, null, {
        customerId,
        warehouseId,
        items: [{ productId: localProductId, quantity: 5, unitPrice: 10 }],
      }),
    ]);

    const results = await Promise.allSettled([
      salesService.confirmSalesOrder(orgId, null, soA.id),
      salesService.confirmSalesOrder(orgId, null, soB.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const balance = await db
      .selectFrom('stock_balances')
      .select('reserved')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', localProductId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(balance.reserved)).toBe(5);
  });
});
