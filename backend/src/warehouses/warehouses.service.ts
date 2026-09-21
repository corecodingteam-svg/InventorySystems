import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { ListQueryDto, paginate, resolveSortColumn } from '../common/pagination/list-query.dto';

const WAREHOUSE_SORTABLE = { name: 'name', code: 'code', createdAt: 'created_at' };

export interface WarehouseInput {
  name: string;
  code: string;
}

export interface LocationInput {
  warehouseId: string;
  parentId?: string | null;
  name: string;
  code: string;
  locationType?: string;
}

@Injectable()
export class WarehousesService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async list(organizationId: string, query: ListQueryDto) {
    const sortColumn = resolveSortColumn(query.sortBy, WAREHOUSE_SORTABLE, 'created_at');
    let builder = this.db
      .selectFrom('warehouses')
      .selectAll()
      .where('organization_id', '=', organizationId);

    if (query.search) {
      builder = builder.where((eb) =>
        eb.or([eb('name', 'ilike', `%${query.search}%`), eb('code', 'ilike', `%${query.search}%`)]),
      );
    }

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
    const warehouse = await this.db
      .selectFrom('warehouses')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    return warehouse;
  }

  async create(organizationId: string, input: WarehouseInput) {
    const existing = await this.db
      .selectFrom('warehouses')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('code', '=', input.code)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'WAREHOUSE_EXISTS', message: 'A warehouse with this code already exists.' });
    }
    return this.db
      .insertInto('warehouses')
      .values({ organization_id: organizationId, name: input.name, code: input.code })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(organizationId: string, id: string, input: Partial<WarehouseInput & { status: string }>) {
    await this.findOne(organizationId, id);
    return this.db
      .updateTable('warehouses')
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // ---- Locations ----

  async listLocations(organizationId: string, warehouseId: string) {
    await this.findOne(organizationId, warehouseId);
    return this.db
      .selectFrom('locations')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('warehouse_id', '=', warehouseId)
      .orderBy('code', 'asc')
      .execute();
  }

  async createLocation(organizationId: string, input: LocationInput) {
    await this.findOne(organizationId, input.warehouseId);
    const existing = await this.db
      .selectFrom('locations')
      .select('id')
      .where('warehouse_id', '=', input.warehouseId)
      .where('code', '=', input.code)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'LOCATION_EXISTS', message: 'A location with this code already exists in this warehouse.' });
    }
    return this.db
      .insertInto('locations')
      .values({
        organization_id: organizationId,
        warehouse_id: input.warehouseId,
        parent_id: input.parentId ?? null,
        name: input.name,
        code: input.code,
        location_type: input.locationType ?? 'BIN',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
