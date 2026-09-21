import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

export class CategoryInput {
  name: string;
  parentId?: string | null;
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(KYSELY) private db: Db) {}

  list(organizationId: string) {
    return this.db
      .selectFrom('categories')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  create(organizationId: string, input: CategoryInput) {
    return this.db
      .insertInto('categories')
      .values({ organization_id: organizationId, name: input.name, parent_id: input.parentId ?? null })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(organizationId: string, id: string, input: Partial<CategoryInput>) {
    const result = await this.db
      .updateTable('categories')
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.parentId !== undefined ? { parent_id: input.parentId } : {}),
      })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Category not found.');
    return result;
  }

  async remove(organizationId: string, id: string) {
    await this.db
      .deleteFrom('categories')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }
}
