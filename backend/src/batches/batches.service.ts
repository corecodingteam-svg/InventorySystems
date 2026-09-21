import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { paginate } from '../common/pagination/list-query.dto';

export interface BatchInput {
  productId: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
}

@Injectable()
export class BatchesService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async list(
    organizationId: string,
    filters: { productId?: string; expiringBeforeDays?: number; page: number; pageSize: number },
  ) {
    let builder = this.db
      .selectFrom('batches')
      .selectAll()
      .where('organization_id', '=', organizationId);

    if (filters.productId) builder = builder.where('product_id', '=', filters.productId);
    if (filters.expiringBeforeDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filters.expiringBeforeDays);
      builder = builder.where('expiry_date', '<=', cutoff.toISOString().slice(0, 10));
    }

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    // FEFO-friendly default ordering: soonest expiry first.
    const rows = await builder
      .orderBy('expiry_date', 'asc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
      .execute();

    return paginate(rows, total, filters.page, filters.pageSize);
  }

  async create(organizationId: string, input: BatchInput) {
    const existing = await this.db
      .selectFrom('batches')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('product_id', '=', input.productId)
      .where('batch_number', '=', input.batchNumber)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({
        code: 'BATCH_EXISTS',
        message: 'A batch with this number already exists for this product.',
      });
    }
    return this.db
      .insertInto('batches')
      .values({
        organization_id: organizationId,
        product_id: input.productId,
        batch_number: input.batchNumber,
        manufacture_date: input.manufactureDate ?? null,
        expiry_date: input.expiryDate ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
