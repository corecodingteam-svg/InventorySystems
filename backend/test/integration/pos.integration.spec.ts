/**
 * Integration test against a REAL PostgreSQL instance for POS: open session
 * -> sale decreases stock immediately -> void reverses it -> close session
 * computes expected cash from actual CASH payments. See
 * inventory.integration.spec.ts for setup notes.
 * Requires: `docker compose up -d postgres`, `npm run migrate:up`, then
 * `RUN_INTEGRATION_TESTS=1 npm test`.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { PosService } from '../../src/pos/pos.service';
import { NIL_UUID } from '../../src/common/constants';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('PosService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let inventoryService: InventoryService;
  let posService: PosService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;
  let registerId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    inventoryService = new InventoryService(db);
    posService = new PosService(db, inventoryService);

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
        .values({ organization_id: orgId, name: 'Store', code: 'STORE' })
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

    const register = await posService.createRegister(orgId, {
      warehouseId,
      name: 'Front Counter',
      code: `REG-${uuid().slice(0, 8)}`,
    });
    registerId = register.id;

    await inventoryService.postMovement(orgId, null, {
      productId,
      warehouseId,
      transactionType: 'OPENING_STOCK',
      quantityIn: 50,
    });
  });

  afterAll(async () => {
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.destroy();
  });

  it('rejects opening a second session on the same register while one is already open', async () => {
    const session = await posService.openSession(orgId, null, { registerId, openingCash: 100 });
    await expect(posService.openSession(orgId, null, { registerId, openingCash: 50 })).rejects.toThrow(
      'already has an open session',
    );
    await posService.closeSession(orgId, null, session.id, { closingCash: 100 });
  });

  it('decreases stock immediately on sale, reverses it on void, and computes expected cash on close', async () => {
    const session = await posService.openSession(orgId, null, { registerId, openingCash: 200 });

    const sale = await posService.createSale(orgId, null, session.id, {
      items: [{ productId, quantity: 3, unitPrice: 20 }],
      payments: [{ method: 'CASH', amount: 60 }],
    });
    expect(Number(sale.total_amount)).toBe(60);

    const afterSale = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterSale.on_hand)).toBe(47);

    await posService.voidSale(orgId, null, sale.id);
    const afterVoid = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(afterVoid.on_hand)).toBe(50);

    const closed = await posService.closeSession(orgId, null, session.id, { closingCash: 260 });
    // expected_cash = opening_cash (200) + CASH payments (60, from the now-voided sale — the
    // payment record itself is not reversed by a void, matching real POS behavior where a
    // void is a separate refund/adjustment, not an erasure of the original transaction).
    expect(Number(closed.expected_cash)).toBe(260);
  });

  it('rejects a sale whose payments do not add up to the total', async () => {
    const session = await posService.openSession(orgId, null, { registerId, openingCash: 0 });
    await expect(
      posService.createSale(orgId, null, session.id, {
        items: [{ productId, quantity: 1, unitPrice: 20 }],
        payments: [{ method: 'CASH', amount: 15 }],
      }),
    ).rejects.toThrow('do not add up');
    await posService.closeSession(orgId, null, session.id, { closingCash: 0 });
  });
});
