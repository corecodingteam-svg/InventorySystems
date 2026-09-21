/**
 * Integration test against a REAL PostgreSQL instance for stock counting
 * (create -> submit -> approve posts variance adjustments through the
 * inventory engine) and the idempotency guarantee on a retried adjustment.
 * See inventory.integration.spec.ts for setup notes.
 * Requires: `docker compose up -d postgres`, `npm run migrate:up`, then
 * `RUN_INTEGRATION_TESTS=1 npm test`.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { Database } from '../../src/database/schema';
import { InventoryService } from '../../src/inventory/inventory.service';
import { StockCountsService } from '../../src/stock-counts/stock-counts.service';
import { NIL_UUID } from '../../src/common/constants';

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('StockCountsService (integration, real Postgres)', () => {
  let db: Kysely<Database>;
  let inventoryService: InventoryService;
  let stockCountsService: StockCountsService;
  let orgId: string;
  let warehouseId: string;
  let productId: string;

  beforeAll(async () => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
    });
    inventoryService = new InventoryService(db);
    stockCountsService = new StockCountsService(db, inventoryService);

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

  it('posts a variance adjustment on approval and leaves stock unchanged when the count matches', async () => {
    const count = await stockCountsService.create(orgId, null, { warehouseId });
    const line = count.lines.find((l: any) => l.product_id === productId);
    expect(line).toBeTruthy();
    expect(Number((line as any).system_quantity)).toBe(100);

    await stockCountsService.start(orgId, count.id);
    // Physical count found only 92 — a shrinkage of 8.
    await stockCountsService.submit(orgId, null, count.id, {
      lines: [{ lineId: (line as any).id, countedQuantity: 92 }],
    });
    const approved = await stockCountsService.approve(orgId, null, count.id);
    expect(approved.status).toBe('APPROVED');

    const balance = await db
      .selectFrom('stock_balances')
      .select('on_hand')
      .where('organization_id', '=', orgId)
      .where('product_id', '=', productId)
      .where('warehouse_id', '=', warehouseId)
      .where('variant_id', '=', NIL_UUID)
      .executeTakeFirstOrThrow();
    expect(Number(balance.on_hand)).toBe(92);

    const ledgerEntry = await db
      .selectFrom('stock_ledger')
      .selectAll()
      .where('organization_id', '=', orgId)
      .where('reference_type', '=', 'STOCK_COUNT')
      .where('reference_id', '=', count.id)
      .executeTakeFirstOrThrow();
    expect(ledgerEntry.transaction_type).toBe('ADJUSTMENT_OUT');
    expect(Number(ledgerEntry.quantity_out)).toBe(8);
  });

  it('does not double-adjust when approve is somehow invoked twice (guarded by status transition, not just idempotency)', async () => {
    const count = await stockCountsService.create(orgId, null, { warehouseId });
    const line = (count.lines as any[])[0];
    await stockCountsService.start(orgId, count.id);
    await stockCountsService.submit(orgId, null, count.id, {
      lines: [{ lineId: line.id, countedQuantity: Number(line.system_quantity) + 5 }],
    });
    await stockCountsService.approve(orgId, null, count.id);

    await expect(stockCountsService.approve(orgId, null, count.id)).rejects.toThrow(
      'must be submitted first',
    );
  });
});
