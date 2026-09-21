import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

@Injectable()
export class TaxService {
  constructor(@Inject(KYSELY) private db: Db) {}

  listCategories(organizationId: string) {
    return this.db
      .selectFrom('tax_categories')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  createCategory(organizationId: string, name: string, code: string) {
    return this.db
      .insertInto('tax_categories')
      .values({ organization_id: organizationId, name, code })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateCategory(organizationId: string, id: string, input: { name?: string; code?: string }) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.code !== undefined) patch.code = input.code;
    const result = await this.db
      .updateTable('tax_categories')
      .set(patch as any)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Tax category not found.');
    return result;
  }

  async removeCategory(organizationId: string, id: string) {
    const inUse = await this.db
      .selectFrom('products')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('tax_category_id', '=', id)
      .executeTakeFirst();
    if (inUse) {
      throw new ConflictException({
        code: 'TAX_CATEGORY_IN_USE',
        message: 'This tax category is assigned to at least one product and cannot be deleted.',
      });
    }
    await this.db
      .deleteFrom('tax_categories')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  async removeRate(organizationId: string, id: string) {
    await this.db
      .deleteFrom('tax_rates')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  async listRates(organizationId: string, taxCategoryId: string) {
    return this.db
      .selectFrom('tax_rates')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('tax_category_id', '=', taxCategoryId)
      .orderBy('name', 'asc')
      .execute();
  }

  async createRate(
    organizationId: string,
    input: { taxCategoryId: string; name: string; ratePercent: number; isDefault?: boolean },
  ) {
    const category = await this.db
      .selectFrom('tax_categories')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', input.taxCategoryId)
      .executeTakeFirst();
    if (!category) throw new NotFoundException('Tax category not found.');

    return this.db.transaction().execute(async (trx) => {
      if (input.isDefault) {
        await trx
          .updateTable('tax_rates')
          .set({ is_default: false })
          .where('tax_category_id', '=', input.taxCategoryId)
          .execute();
      }
      return trx
        .insertInto('tax_rates')
        .values({
          organization_id: organizationId,
          tax_category_id: input.taxCategoryId,
          name: input.name,
          rate_percent: input.ratePercent.toString(),
          is_default: input.isDefault ?? false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  /** Computes tax for a line amount using the product's tax category's default rate. Returns 0 if the product has no tax category. */
  async computeTaxForProduct(organizationId: string, productId: string, amount: number) {
    const product = await this.db
      .selectFrom('products')
      .select('tax_category_id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', productId)
      .executeTakeFirst();
    if (!product?.tax_category_id) return { rate: 0, taxAmount: 0 };

    const rate = await this.db
      .selectFrom('tax_rates')
      .select('rate_percent')
      .where('organization_id', '=', organizationId)
      .where('tax_category_id', '=', product.tax_category_id)
      .where('is_default', '=', true)
      .executeTakeFirst();
    if (!rate) return { rate: 0, taxAmount: 0 };

    const ratePercent = Number(rate.rate_percent);
    return { rate: ratePercent, taxAmount: (amount * ratePercent) / 100 };
  }
}
