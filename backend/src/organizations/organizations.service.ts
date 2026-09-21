import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { KYSELY, Db } from '../database/database.module';

export class UpdateOrganizationInput {
  name?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async getCurrent(organizationId: string) {
    const org = await this.db
      .selectFrom('organizations')
      .selectAll()
      .where('id', '=', organizationId)
      .executeTakeFirst();
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  async updateCurrent(organizationId: string, input: UpdateOrganizationInput) {
    await this.getCurrent(organizationId);
    return this.db
      .updateTable('organizations')
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updated_at: sql`now()`,
      })
      .where('id', '=', organizationId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
