import 'reflect-metadata';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { Database } from './schema';

/**
 * Production-safe bootstrap: creates one organization with one admin user holding every permission.
 * No demo data. Idempotent: does nothing if the organization slug already exists.
 * Usage (env): DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ORG_NAME (optional)
 */
async function main() {
  const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ORG_NAME = 'Advaitamaa' } = process.env;
  if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const slug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: DATABASE_URL }) }) });

  const existing = await db.selectFrom('organizations').select('id').where('slug', '=', slug).executeTakeFirst();
  if (existing) {
    console.log(`Organization "${slug}" already exists, nothing to do.`);
    await db.destroy();
    return;
  }

  await db.transaction().execute(async (trx) => {
    const org = await trx
      .insertInto('organizations')
      .values({ name: ORG_NAME, slug, status: 'active' })
      .returningAll()
      .executeTakeFirstOrThrow();

    const admin = await trx
      .insertInto('users')
      .values({
        organization_id: org.id,
        email: ADMIN_EMAIL,
        password_hash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        full_name: 'Administrator',
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
      await trx.insertInto('role_permissions').values(permissions.map((p) => ({ role_id: role.id, permission_id: p.id }))).execute();
    }
    await trx.insertInto('user_roles').values({ user_id: admin.id, role_id: role.id }).execute();
  });

  console.log(`Created organization "${ORG_NAME}" and admin ${ADMIN_EMAIL}.`);
  await db.destroy();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
