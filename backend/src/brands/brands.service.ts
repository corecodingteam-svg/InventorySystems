import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

@Injectable()
export class BrandsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  list(organizationId: string) {
    return this.db
      .selectFrom('brands')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  create(organizationId: string, name: string) {
    return this.db
      .insertInto('brands')
      .values({ organization_id: organizationId, name })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(organizationId: string, id: string, name: string) {
    const result = await this.db
      .updateTable('brands')
      .set({ name })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Brand not found.');
    return result;
  }

  async remove(organizationId: string, id: string) {
    await this.db
      .deleteFrom('brands')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }
}
