import { createHmac, randomBytes } from 'crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { KYSELY, Db } from '../database/database.module';

export interface CreateWebhookSubscriptionInput {
  url: string;
  eventTypes: string[];
}

/**
 * Fires webhooks synchronously, best-effort, at the point of the call —
 * there is no background job queue in this codebase yet (architecture.md
 * names Redis/BullMQ for this, not implemented). A slow or unreachable
 * subscriber therefore adds latency to whatever request triggered the
 * event; every delivery attempt (success or failure) is still recorded in
 * `webhook_deliveries` so a real queue-backed retry worker could be added
 * later without changing the calling code, only this service's internals.
 * See docs/integrations.md.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhooksService');

  constructor(@Inject(KYSELY) private db: Db) {}

  listSubscriptions(organizationId: string) {
    return this.db
      .selectFrom('webhook_subscriptions')
      .select(['id', 'url', 'event_types', 'status', 'created_at'])
      .where('organization_id', '=', organizationId)
      .execute();
  }

  createSubscription(organizationId: string, input: CreateWebhookSubscriptionInput) {
    const secret = randomBytes(24).toString('hex');
    return this.db
      .insertInto('webhook_subscriptions')
      .values({
        organization_id: organizationId,
        url: input.url,
        event_types: JSON.stringify(input.eventTypes),
        secret,
      })
      .returning(['id', 'url', 'event_types', 'status', 'created_at', 'secret'])
      .executeTakeFirstOrThrow();
  }

  async removeSubscription(organizationId: string, id: string) {
    const existing = await this.db
      .selectFrom('webhook_subscriptions')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!existing) throw new NotFoundException('Webhook subscription not found.');
    await this.db.deleteFrom('webhook_subscriptions').where('id', '=', id).execute();
    return { success: true };
  }

  async listDeliveries(organizationId: string, subscriptionId: string) {
    return this.db
      .selectFrom('webhook_deliveries')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('webhook_subscription_id', '=', subscriptionId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .execute();
  }

  /** Called by other services after a business event — never awaited-and-thrown on by the caller (a webhook failure must not fail the triggering request). */
  async dispatch(organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.db
      .selectFrom('webhook_subscriptions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('status', '=', 'active')
      .execute();

    const matching = subscriptions.filter((s) => {
      const types = (s.event_types as unknown as string[]) ?? [];
      return types.includes(eventType) || types.includes('*');
    });

    await Promise.all(matching.map((sub) => this.deliver(organizationId, sub, eventType, payload)));
  }

  private async deliver(
    organizationId: string,
    subscription: { id: string; url: string; secret: string },
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({ event: eventType, data: payload });
    const signature = createHmac('sha256', subscription.secret).update(body).digest('hex');

    const delivery = await this.db
      .insertInto('webhook_deliveries')
      .values({
        organization_id: organizationId,
        webhook_subscription_id: subscription.id,
        event_type: eventType,
        payload: body,
        attempts: 1,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    try {
      await axios.post(subscription.url, body, {
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        timeout: 5000,
      });
      await this.db
        .updateTable('webhook_deliveries')
        .set({ status: 'DELIVERED', delivered_at: new Date() })
        .where('id', '=', delivery.id)
        .execute();
    } catch (err) {
      this.logger.warn(`Webhook delivery to ${subscription.url} failed: ${(err as Error).message}`);
      await this.db
        .updateTable('webhook_deliveries')
        .set({ status: 'FAILED', last_error: (err as Error).message })
        .where('id', '=', delivery.id)
        .execute();
    }
  }
}
