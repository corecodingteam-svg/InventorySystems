import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

export interface CreatePriceListInput {
  name: string;
  scope: 'GENERAL' | 'CUSTOMER' | 'WAREHOUSE';
  customerId?: string;
  warehouseId?: string;
  priority?: number;
}

@Injectable()
export class PricingService {
  constructor(@Inject(KYSELY) private db: Db) {}

  listPriceLists(organizationId: string) {
    return this.db
      .selectFrom('price_lists')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('priority', 'desc')
      .execute();
  }

  createPriceList(organizationId: string, input: CreatePriceListInput) {
    return this.db
      .insertInto('price_lists')
      .values({
        organization_id: organizationId,
        name: input.name,
        scope: input.scope,
        customer_id: input.customerId ?? null,
        warehouse_id: input.warehouseId ?? null,
        priority: input.priority ?? 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async setItemPrice(organizationId: string, priceListId: string, productId: string, price: number) {
    const priceList = await this.db
      .selectFrom('price_lists')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', priceListId)
      .executeTakeFirst();
    if (!priceList) throw new NotFoundException('Price list not found.');

    return this.db
      .insertInto('price_list_items')
      .values({ organization_id: organizationId, price_list_id: priceListId, product_id: productId, price: price.toString() })
      .onConflict((oc) => oc.columns(['price_list_id', 'product_id']).doUpdateSet({ price: price.toString() }))
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updatePriceList(
    organizationId: string,
    id: string,
    input: { name?: string; priority?: number; status?: string },
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.status !== undefined) patch.status = input.status;
    const result = await this.db
      .updateTable('price_lists')
      .set(patch as any)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Price list not found.');
    return result;
  }

  async removePriceList(organizationId: string, id: string) {
    await this.db
      .deleteFrom('price_lists')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  async removeItem(organizationId: string, priceListId: string, productId: string) {
    await this.db
      .deleteFrom('price_list_items')
      .where('organization_id', '=', organizationId)
      .where('price_list_id', '=', priceListId)
      .where('product_id', '=', productId)
      .execute();
    return { success: true };
  }

  async listItems(organizationId: string, priceListId: string) {
    return this.db
      .selectFrom('price_list_items')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('price_list_id', '=', priceListId)
      .execute();
  }

  /**
   * Resolves the price for a product given optional customer/warehouse
   * context. Precedence: highest-priority matching CUSTOMER price list ->
   * highest-priority matching WAREHOUSE price list -> highest-priority
   * GENERAL price list -> the product's own selling_price as the fallback.
   */
  async resolvePrice(
    organizationId: string,
    productId: string,
    context: { customerId?: string; warehouseId?: string },
  ): Promise<number> {
    const candidates = await this.db
      .selectFrom('price_lists as pl')
      .innerJoin('price_list_items as pli', 'pli.price_list_id', 'pl.id')
      .select(['pl.scope', 'pl.priority', 'pli.price'])
      .where('pl.organization_id', '=', organizationId)
      .where('pl.status', '=', 'active')
      .where('pli.product_id', '=', productId)
      .where((eb) =>
        eb.or([
          eb('pl.scope', '=', 'GENERAL'),
          eb.and([eb('pl.scope', '=', 'CUSTOMER'), eb('pl.customer_id', '=', context.customerId ?? '')]),
          eb.and([eb('pl.scope', '=', 'WAREHOUSE'), eb('pl.warehouse_id', '=', context.warehouseId ?? '')]),
        ]),
      )
      .execute();

    if (candidates.length === 0) {
      const product = await this.db
        .selectFrom('products')
        .select('selling_price')
        .where('organization_id', '=', organizationId)
        .where('id', '=', productId)
        .executeTakeFirst();
      return Number(product?.selling_price ?? 0);
    }

    const scopeRank = { CUSTOMER: 2, WAREHOUSE: 1, GENERAL: 0 } as const;
    candidates.sort((a, b) => {
      const rankDiff = scopeRank[b.scope as keyof typeof scopeRank] - scopeRank[a.scope as keyof typeof scopeRank];
      return rankDiff !== 0 ? rankDiff : b.priority - a.priority;
    });
    return Number(candidates[0].price);
  }
}
