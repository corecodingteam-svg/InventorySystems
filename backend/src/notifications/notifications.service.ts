import { Inject, Injectable } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { paginate } from '../common/pagination/list-query.dto';

export interface CreateNotificationInput {
  /** Omit for an organization-wide broadcast (e.g. low stock) rather than a specific user. */
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

/**
 * In-app notification store. This is the one channel implemented today —
 * email/SMS/WhatsApp/push are architected for (see docs/notifications.md)
 * but not wired to a real provider, since no provider credentials exist in
 * this environment and the master spec explicitly says not to fake external
 * integrations.
 */
@Injectable()
export class NotificationsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async create(organizationId: string, input: CreateNotificationInput) {
    return this.db
      .insertInto('notifications')
      .values({
        organization_id: organizationId,
        user_id: input.userId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /** A user sees their own notifications plus organization-wide broadcasts (user_id is null). */
  async list(organizationId: string, userId: string, page: number, pageSize: number) {
    const builder = this.db
      .selectFrom('notifications')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where((eb) => eb.or([eb('user_id', '=', userId), eb('user_id', 'is', null)]));

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();

    return paginate(rows, total, page, pageSize);
  }

  async markRead(organizationId: string, userId: string, id: string) {
    await this.db
      .updateTable('notifications')
      .set({ is_read: true })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .where((eb) => eb.or([eb('user_id', '=', userId), eb('user_id', 'is', null)]))
      .execute();
    return { success: true };
  }
}
