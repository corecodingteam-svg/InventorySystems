import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { paginate, resolveSortColumn } from '../common/pagination/list-query.dto';
import { CreateSupplierDto, SupplierListQueryDto, UpdateSupplierDto } from './dto/supplier.dto';

const SORTABLE = { name: 'name', code: 'code', createdAt: 'created_at' };

@Injectable()
export class SuppliersService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async list(organizationId: string, query: SupplierListQueryDto) {
    const sortColumn = resolveSortColumn(query.sortBy, SORTABLE, 'created_at');
    let builder = this.db
      .selectFrom('suppliers')
      .selectAll()
      .where('organization_id', '=', organizationId);

    if (query.search) {
      builder = builder.where((eb) =>
        eb.or([eb('name', 'ilike', `%${query.search}%`), eb('code', 'ilike', `%${query.search}%`)]),
      );
    }
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

  async findOne(organizationId: string, id: string) {
    const supplier = await this.db
      .selectFrom('suppliers')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!supplier) throw new NotFoundException('Supplier not found.');
    return supplier;
  }

  async create(organizationId: string, dto: CreateSupplierDto) {
    const existing = await this.db
      .selectFrom('suppliers')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('code', '=', dto.code)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'SUPPLIER_EXISTS', message: 'A supplier with this code already exists.' });
    }
    return this.db
      .insertInto('suppliers')
      .values({
        organization_id: organizationId,
        name: dto.name,
        code: dto.code,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        payment_terms: dto.paymentTerms ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(organizationId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(organizationId, id);
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.paymentTerms !== undefined) patch.payment_terms = dto.paymentTerms;
    if (dto.status !== undefined) patch.status = dto.status;
    return this.db
      .updateTable('suppliers')
      .set(patch as any)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
