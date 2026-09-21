import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { paginate } from '../common/pagination/list-query.dto';

@Injectable()
export class SerialNumbersService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async list(
    organizationId: string,
    filters: { productId?: string; search?: string; status?: string; page: number; pageSize: number },
  ) {
    let builder = this.db
      .selectFrom('serial_numbers')
      .selectAll()
      .where('organization_id', '=', organizationId);

    if (filters.productId) builder = builder.where('product_id', '=', filters.productId);
    if (filters.status) builder = builder.where('status', '=', filters.status);
    if (filters.search) builder = builder.where('serial_number', 'ilike', `%${filters.search}%`);

    const countRow = await builder
      .clearSelect()
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirst();
    const total = Number(countRow?.count ?? 0);

    const rows = await builder
      .orderBy('created_at', 'desc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
      .execute();

    return paginate(rows, total, filters.page, filters.pageSize);
  }

  async create(organizationId: string, productId: string, serialNumber: string) {
    const existing = await this.db
      .selectFrom('serial_numbers')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('product_id', '=', productId)
      .where('serial_number', '=', serialNumber)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'SERIAL_EXISTS', message: 'This serial number already exists for this product.' });
    }
    return this.db
      .insertInto('serial_numbers')
      .values({ organization_id: organizationId, product_id: productId, serial_number: serialNumber })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /** Full traceability: every ledger movement this serial number has ever been part of. */
  async history(organizationId: string, id: string) {
    const serial = await this.db
      .selectFrom('serial_numbers')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!serial) throw new NotFoundException('Serial number not found.');

    const movements = await this.db
      .selectFrom('stock_ledger')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('serial_number_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute();

    return { serial, movements };
  }
}
