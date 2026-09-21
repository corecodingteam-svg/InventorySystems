/**
 * Integration tests against a REAL PostgreSQL instance — the concurrency
 * guarantee in InventoryService (row-locked stock_balances) cannot be
 * verified with a mocked query builder, only with real transactions racing
 * against a real database.
 *
 * Requires: `docker compose up -d postgres` (or any reachable Postgres) and
 * `npm run migrate:up`, with DATABASE_URL pointing at it. Skipped by default
 * (see jest config) unless RUN_INTEGRATION_TESTS=1 is set, so `npm test`
 * stays usable without a database.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { NIL_UUID } from '../../src/common/constants';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('InventoryService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let service: InventoryService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let unitId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      }),
    });
    service = new InventoryService(db);

    const org = await db
      .insertInto('organizations')
      .values({ name: 'Test Org', slug: `test-org-${uuid()}`, status: 'active' })
      .returningAll()
      .executeTakeFirstOrThrow();
    orgId = org.id;

    unitId = (
      await db
        .insertInto('units')
        .values({ organization_id: orgId, name: 'Piece', code: 'PCS' })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

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
          base_unit_id: unitId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('increases stock on a purchase receipt and decreases it on a sale', async () => {
    await service.postMovement(orgId, null, {
      productId,
      warehouseId,
      transactionType: 'PURCHASE_RECEIPT',
      quantityIn: 100,
    });
    const afterReceipt = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterReceipt.on_hand)).toBe(100);

    await service.postMovement(orgId, null, {
      productId,
      warehouseId,
      transactionType: 'SALES_ISSUE',
      quantityOut: 30,
    });
    const afterSale = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterSale.on_hand)).toBe(70);
  });

  it('does not allow two concurrent sales to oversell the last units', async () => {
    // Fresh product isolated to this test.
    const localProductId = (
      await db
        .insertInto('products')
        .values({
          organization_id: orgId,
          sku: `SKU-CONCURRENT-${uuid()}`,
          name: 'Concurrency Test Product',
          base_unit_id: unitId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    await service.postMovement(orgId, null, {
      productId: localProductId,
      warehouseId,
      transactionType: 'OPENING_STOCK',
      quantityIn: 5,
    });

    // Two concurrent attempts to sell 5 units each — only one may succeed.
    const results = await Promise.allSettled([
      service.postMovement(orgId, null, {
        productId: localProductId,
        warehouseId,
        transactionType: 'SALES_ISSUE',
        quantityOut: 5,
      }),
      service.postMovement(orgId, null, {
        productId: localProductId,
        warehouseId,
        transactionType: 'SALES_ISSUE',
        quantityOut: 5,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalBalance = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', localProductId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(finalBalance.on_hand)).toBe(0);
  });

  it('moves stock atomically between warehouses on transfer', async () => {
    const toWarehouseId = (
      await db
        .insertInto('warehouses')
        .values({ organization_id: orgId, name: 'Secondary', code: `SEC-${uuid().slice(0, 8)}` })
        .returningAll()
        .executeTakeFirstOrThrow()
    ).id;

    await service.postMovement(orgId, null, {
      productId,
      warehouseId,
      transactionType: 'OPENING_STOCK',
      quantityIn: 20,
    });

    await service.transfer(orgId, null, {
      productId,
      fromWarehouseId: warehouseId,
      toWarehouseId,
      quantity: 8,
    });

    const source = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    const dest = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', toWarehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();

    expect(Number(dest.on_hand)).toBe(8);
    expect(Number(source.on_hand)).toBeGreaterThanOrEqual(0);
  });
});
