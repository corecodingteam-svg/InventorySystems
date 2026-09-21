import { Inject, Injectable } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { userHasPermission } from '../auth/permission-check.util';

@Injectable()
export class WorkflowService {
  constructor(@Inject(KYSELY) private db: Db) {}

  listPurchaseApprovalRules(organizationId: string) {
    return this.db
      .selectFrom('purchase_approval_rules')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('min_amount', 'asc')
      .execute();
  }

  createPurchaseApprovalRule(
    organizationId: string,
    input: { name: string; minAmount: number; requiredPermission: string },
  ) {
    return this.db
      .insertInto('purchase_approval_rules')
      .values({
        organization_id: organizationId,
        name: input.name,
        min_amount: input.minAmount.toString(),
        required_permission: input.requiredPermission,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async removePurchaseApprovalRule(organizationId: string, id: string) {
    await this.db
      .deleteFrom('purchase_approval_rules')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  /**
   * The highest min_amount rule at or below the PO total is the one that
   * applies — e.g. a "> ₹100,000 needs Finance approval" rule and a
   * "> ₹10,000 needs Manager approval" rule both existing means a
   * ₹150,000 PO requires the Finance permission, not just the Manager one.
   */
  async resolveApplicableRule(organizationId: string, poTotal: number) {
    const rules = await this.listPurchaseApprovalRules(organizationId);
    const applicable = rules.filter((r) => poTotal >= Number(r.min_amount));
    if (applicable.length === 0) return null;
    return applicable.reduce((highest, r) =>
      Number(r.min_amount) > Number(highest.min_amount) ? r : highest,
    );
  }

  /** Throws nothing — returns whether the user may approve a PO of this total under configured rules. */
  async canApprovePurchaseOrder(organizationId: string, userId: string, poTotal: number): Promise<boolean> {
    const rule = await this.resolveApplicableRule(organizationId, poTotal);
    if (!rule) return true; // no threshold configured — the purchase.approve permission (already guard-checked) is sufficient
    return userHasPermission(this.db, userId, rule.required_permission);
  }
}
