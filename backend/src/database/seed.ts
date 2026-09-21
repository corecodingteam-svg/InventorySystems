import 'reflect-metadata';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { Database } from './schema';

/**
 * Development seed data only. Never run against production.
 * Usage: npm run seed (from backend/, with DATABASE_URL set)
 */
async function main() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
    }),
  });

  const existing = await db
    .selectFrom('organizations')
    .select('id')
    .where('slug', '=', 'demo-organization')
    .executeTakeFirst();

  if (existing) {
    console.log('Seed data already present, skipping.');
    await db.destroy();
    return;
  }

  await db.transaction().execute(async (trx) => {
    const org = await trx
      .insertInto('organizations')
      .values({ name: 'Demo Organization', slug: 'demo-organization', status: 'active' })
      .returningAll()
      .executeTakeFirstOrThrow();

    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
    const admin = await trx
      .insertInto('users')
      .values({
        organization_id: org.id,
        email: 'admin@demo.local',
        password_hash: passwordHash,
        full_name: 'Demo Admin',
        status: 'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const role = await trx
      .insertInto('roles')
      .values({ organization_id: org.id, name: 'Organization Admin', is_system: true })
      .returningAll()
      .executeTakeFirstOrThrow();

    const permissions = await trx.selectFrom('permissions').select('id').execute();
    if (permissions.length > 0) {
      await trx
        .insertInto('role_permissions')
        .values(permissions.map((p) => ({ role_id: role.id, permission_id: p.id })))
        .execute();
    }

    await trx.insertInto('user_roles').values({ user_id: admin.id, role_id: role.id }).execute();

    const pieceUnit = await trx
      .insertInto('units')
      .values({ organization_id: org.id, name: 'Piece', code: 'PCS' })
      .returningAll()
      .executeTakeFirstOrThrow();
    const boxUnit = await trx
      .insertInto('units')
      .values({ organization_id: org.id, name: 'Box', code: 'BOX' })
      .returningAll()
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('unit_conversions')
      .values({ organization_id: org.id, from_unit_id: boxUnit.id, to_unit_id: pieceUnit.id, factor: '12' })
      .execute();

    const category = await trx
      .insertInto('categories')
      .values({ organization_id: org.id, name: 'General' })
      .returningAll()
      .executeTakeFirstOrThrow();
    const brand = await trx
      .insertInto('brands')
      .values({ organization_id: org.id, name: 'Generic' })
      .returningAll()
      .executeTakeFirstOrThrow();

    const warehouse = await trx
      .insertInto('warehouses')
      .values({ organization_id: org.id, name: 'Main Warehouse', code: 'MAIN' })
      .returningAll()
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('locations')
      .values({
        organization_id: org.id,
        warehouse_id: warehouse.id,
        name: 'Receiving',
        code: 'RECV',
        location_type: 'RECEIVING',
      })
      .execute();

    const product = await trx
      .insertInto('products')
      .values({
        organization_id: org.id,
        sku: 'DEMO-001',
        name: 'Demo Product',
        category_id: category.id,
        brand_id: brand.id,
        base_unit_id: pieceUnit.id,
        cost_price: '10.00',
        selling_price: '15.00',
        reorder_point: '20',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('suppliers')
      .values({ organization_id: org.id, name: 'Demo Supplier Co.', code: 'SUP-001' })
      .execute();
    await trx
      .insertInto('customers')
      .values({ organization_id: org.id, name: 'Demo Customer Inc.', code: 'CUST-001' })
      .execute();
    await trx
      .insertInto('pos_registers')
      .values({ organization_id: org.id, warehouse_id: warehouse.id, name: 'Front Counter', code: 'REG-001' })
      .execute();

    console.log('Seeded demo organization.');
    console.log('  Login: admin@demo.local / ChangeMe123!  (development only — rotate before production)');
    console.log(`  Demo product: ${product.sku} in warehouse ${warehouse.code} (no opening stock — post one via POST /inventory/opening-stock).`);
  });

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
