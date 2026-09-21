import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { WebhooksService } from '../webhooks/webhooks.service';
import { paginate, resolveSortColumn } from '../common/pagination/list-query.dto';
import { CreateProductDto, CreateVariantDto, ProductListQueryDto, UpdateProductDto } from './dto/product.dto';

const SORTABLE = {
  name: 'name',
  sku: 'sku',
  createdAt: 'created_at',
  costPrice: 'cost_price',
  sellingPrice: 'selling_price',
};

@Injectable()
export class ProductsService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private webhooksService: WebhooksService,
  ) {}

  async list(organizationId: string, query: ProductListQueryDto) {
    const sortColumn = resolveSortColumn(query.sortBy, SORTABLE, 'created_at');
    let builder = this.db
      .selectFrom('products')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('deleted_at', 'is', null);

    if (query.search) {
      builder = builder.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${query.search}%`),
          eb('sku', 'ilike', `%${query.search}%`),
          eb('barcode', 'ilike', `%${query.search}%`),
        ]),
      );
    }
    if (query.categoryId) builder = builder.where('category_id', '=', query.categoryId);
    if (query.brandId) builder = builder.where('brand_id', '=', query.brandId);
    if (query.status) builder = builder.where('status', '=', query.status);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy(sortColumn as any, query.sortOrder ?? 'asc')
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
      .execute();

    return paginate(rows, total, query.page, query.pageSize);
  }

  /** Barcode/QR scan resolution: checks the product's own barcode first, then any variant's. */
  async findByBarcode(organizationId: string, barcode: string) {
    const product = await this.db
      .selectFrom('products')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('barcode', '=', barcode)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (product) return { product, variant: null };

    const variant = await this.db
      .selectFrom('product_variants')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('barcode', '=', barcode)
      .executeTakeFirst();
    if (!variant) throw new NotFoundException('No product or variant found for this barcode.');

    const parentProduct = await this.db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', variant.product_id)
      .executeTakeFirstOrThrow();
    return { product: parentProduct, variant };
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.db
      .selectFrom('products')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    const existing = await this.db
      .selectFrom('products')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('sku', '=', dto.sku)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'PRODUCT_EXISTS', message: 'A product with this SKU already exists.' });
    }

    const product = await this.db
      .insertInto('products')
      .values({
        organization_id: organizationId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description ?? null,
        category_id: dto.categoryId ?? null,
        brand_id: dto.brandId ?? null,
        base_unit_id: dto.baseUnitId,
        barcode: dto.barcode ?? null,
        product_type: dto.productType ?? 'PHYSICAL',
        cost_price: (dto.costPrice ?? 0).toString(),
        selling_price: (dto.sellingPrice ?? 0).toString(),
        track_batches: dto.trackBatches ?? false,
        track_serials: dto.trackSerials ?? false,
        allow_negative_stock: dto.allowNegativeStock ?? false,
        reorder_point: (dto.reorderPoint ?? 0).toString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.webhooksService.dispatch(organizationId, 'product.created', { product });
    return product;
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(organizationId, id);
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.categoryId !== undefined) patch.category_id = dto.categoryId;
    if (dto.brandId !== undefined) patch.brand_id = dto.brandId;
    if (dto.barcode !== undefined) patch.barcode = dto.barcode;
    if (dto.costPrice !== undefined) patch.cost_price = dto.costPrice.toString();
    if (dto.sellingPrice !== undefined) patch.selling_price = dto.sellingPrice.toString();
    if (dto.trackBatches !== undefined) patch.track_batches = dto.trackBatches;
    if (dto.trackSerials !== undefined) patch.track_serials = dto.trackSerials;
    if (dto.allowNegativeStock !== undefined) patch.allow_negative_stock = dto.allowNegativeStock;
    if (dto.reorderPoint !== undefined) patch.reorder_point = dto.reorderPoint.toString();
    if (dto.status !== undefined) patch.status = dto.status;

    return this.db
      .updateTable('products')
      .set(patch as any)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.db
      .updateTable('products')
      .set({ deleted_at: new Date() })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  // ---- Variants ----

  async listVariants(organizationId: string, productId: string) {
    await this.findOne(organizationId, productId);
    return this.db
      .selectFrom('product_variants')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('product_id', '=', productId)
      .orderBy('sku', 'asc')
      .execute();
  }

  async createVariant(organizationId: string, productId: string, dto: CreateVariantDto) {
    await this.findOne(organizationId, productId);
    const existing = await this.db
      .selectFrom('product_variants')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('sku', '=', dto.sku)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'VARIANT_EXISTS', message: 'A variant with this SKU already exists.' });
    }
    return this.db
      .insertInto('product_variants')
      .values({
        organization_id: organizationId,
        product_id: productId,
        sku: dto.sku,
        attributes: JSON.stringify(dto.attributes),
        barcode: dto.barcode ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
