import { Inject, Injectable } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

/**
 * Platform billing/plan architecture only — no payment gateway is wired
 * (no credentials exist in this environment, and it's out of scope for an
 * on-prem/self-hosted deployment per docs/vps-deployment.md, which is the
 * primary target). `plan` is a free-text catalog key so new tiers need no
 * migration. Nothing in the codebase currently gates a feature by plan —
 * this is the record-keeping layer a future enforcement check would read.
 */
@Injectable()
export class SubscriptionsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async getCurrent(organizationId: string) {
    const existing = await this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .executeTakeFirst();
    if (existing) return existing;

    // Every organization implicitly has a FREE subscription until one is
    // explicitly created — avoids a migration-time backfill for orgs that
    // predate this table.
    return this.db
      .insertInto('subscriptions')
      .values({ organization_id: organizationId, plan: 'FREE', seats: 1 })
      .onConflict((oc) => oc.column('organization_id').doNothing())
      .returningAll()
      .executeTakeFirst()
      .then(
        (row) =>
          row ??
          this.db
            .selectFrom('subscriptions')
            .selectAll()
            .where('organization_id', '=', organizationId)
            .executeTakeFirstOrThrow(),
      );
  }

  async updatePlan(organizationId: string, plan: string, seats?: number) {
    await this.getCurrent(organizationId);
    return this.db
      .updateTable('subscriptions')
      .set({ plan, ...(seats !== undefined ? { seats } : {}) })
      .where('organization_id', '=', organizationId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
