import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { KYSELY, Db } from '../database/database.module';
import {
  CreateCustomFieldDefinitionDto,
  SetCustomFieldValuesDto,
  UpdateCustomFieldDefinitionDto,
} from './dto/custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async listDefinitions(organizationId: string, entityType: string) {
    return this.db
      .selectFrom('custom_field_definitions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('entity_type', '=', entityType)
      .orderBy('sort_order', 'asc')
      .execute();
  }

  async createDefinition(organizationId: string, dto: CreateCustomFieldDefinitionDto) {
    const existing = await this.db
      .selectFrom('custom_field_definitions')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('entity_type', '=', dto.entityType)
      .where('field_key', '=', dto.fieldKey)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({
        code: 'CUSTOM_FIELD_EXISTS',
        message: 'A custom field with this key already exists for this entity type.',
      });
    }
    return this.db
      .insertInto('custom_field_definitions')
      .values({
        organization_id: organizationId,
        entity_type: dto.entityType,
        field_key: dto.fieldKey,
        label: dto.label,
        field_type: dto.fieldType,
        options: JSON.stringify(dto.options ?? []),
        is_required: dto.isRequired ?? false,
        sort_order: dto.sortOrder ?? 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateDefinition(organizationId: string, id: string, dto: UpdateCustomFieldDefinitionDto) {
    const patch: Record<string, unknown> = {};
    if (dto.label !== undefined) patch.label = dto.label;
    if (dto.options !== undefined) patch.options = JSON.stringify(dto.options);
    if (dto.isRequired !== undefined) patch.is_required = dto.isRequired;
    if (dto.sortOrder !== undefined) patch.sort_order = dto.sortOrder;
    return this.db
      .updateTable('custom_field_definitions')
      .set(patch as any)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async removeDefinition(organizationId: string, id: string) {
    await this.db
      .deleteFrom('custom_field_definitions')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  async getValues(organizationId: string, entityType: string, entityId: string) {
    const rows = await this.db
      .selectFrom('custom_field_values')
      .select(['field_key', 'value'])
      .where('organization_id', '=', organizationId)
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .execute();
    return Object.fromEntries(rows.map((r) => [r.field_key, r.value]));
  }

  /** Validates against the entity's field definitions (required fields, known keys) before writing. */
  async setValues(organizationId: string, entityType: string, dto: SetCustomFieldValuesDto) {
    const definitions = await this.listDefinitions(organizationId, entityType);
    const byKey = new Map(definitions.map((d) => [d.field_key, d]));

    for (const key of Object.keys(dto.values)) {
      if (!byKey.has(key)) {
        throw new BadRequestException({
          code: 'UNKNOWN_CUSTOM_FIELD',
          message: `"${key}" is not a defined custom field for ${entityType}.`,
        });
      }
    }
    for (const def of definitions) {
      if (def.is_required && (dto.values[def.field_key] === undefined || dto.values[def.field_key] === null)) {
        throw new BadRequestException({
          code: 'CUSTOM_FIELD_REQUIRED',
          message: `"${def.label}" is required.`,
        });
      }
    }

    return this.db.transaction().execute(async (trx) => {
      for (const [key, value] of Object.entries(dto.values)) {
        await trx
          .insertInto('custom_field_values')
          .values({
            organization_id: organizationId,
            entity_type: entityType,
            entity_id: dto.entityId,
            field_key: key,
            value: JSON.stringify(value),
          })
          .onConflict((oc) =>
            oc
              .columns(['organization_id', 'entity_type', 'entity_id', 'field_key'])
              .doUpdateSet({ value: JSON.stringify(value), updated_at: sql`now()` }),
          )
          .execute();
      }
      return this.getValues(organizationId, entityType, dto.entityId);
    });
  }
}
