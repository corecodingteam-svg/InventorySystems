import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

export interface CreateIntegrationConnectionInput {
  provider: string;
  name: string;
  config: Record<string, unknown>;
}

/**
 * Storage + lifecycle for integration connections. No real provider
 * (Shopify, WooCommerce, Tally, Zoho Books, ...) is implemented — per the
 * master spec, "do not implement every integration immediately, build the
 * abstraction correctly." `provider` is a free-text catalog key, not an
 * enum, so a new connector needs no migration; adding a real one means
 * writing a class that reads a connection's `config` and does the
 * provider-specific sync work, not changing this service or its schema.
 * See docs/integrations.md.
 */
@Injectable()
export class IntegrationsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  list(organizationId: string) {
    return this.db
      .selectFrom('integration_connections')
      .select(['id', 'provider', 'name', 'status', 'created_at', 'updated_at'])
      .where('organization_id', '=', organizationId)
      .execute();
  }

  async create(organizationId: string, input: CreateIntegrationConnectionInput) {
    const existing = await this.db
      .selectFrom('integration_connections')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('provider', '=', input.provider)
      .where('name', '=', input.name)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({
        code: 'INTEGRATION_EXISTS',
        message: 'A connection with this name already exists for this provider.',
      });
    }
    return this.db
      .insertInto('integration_connections')
      .values({
        organization_id: organizationId,
        provider: input.provider,
        name: input.name,
        config: JSON.stringify(input.config),
      })
      .returning(['id', 'provider', 'name', 'status', 'created_at'])
      .executeTakeFirstOrThrow();
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.db
      .selectFrom('integration_connections')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!existing) throw new NotFoundException('Integration connection not found.');
    await this.db.deleteFrom('integration_connections').where('id', '=', id).execute();
    return { success: true };
  }
}
