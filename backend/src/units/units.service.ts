import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { CreateUnitConversionDto, CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@Injectable()
export class UnitsService {
  constructor(@Inject(KYSELY) private db: Db) {}

  list(organizationId: string) {
    return this.db
      .selectFrom('units')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  async create(organizationId: string, dto: CreateUnitDto) {
    const existing = await this.db
      .selectFrom('units')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('code', '=', dto.code)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'UNIT_EXISTS', message: 'A unit with this code already exists.' });
    }
    return this.db
      .insertInto('units')
      .values({ organization_id: organizationId, name: dto.name, code: dto.code })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(organizationId: string, id: string, dto: UpdateUnitDto) {
    const result = await this.db
      .updateTable('units')
      .set({ ...(dto.name !== undefined ? { name: dto.name } : {}) })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Unit not found.');
    return result;
  }

  async remove(organizationId: string, id: string) {
    const inUse = await this.db
      .selectFrom('products')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('base_unit_id', '=', id)
      .executeTakeFirst();
    if (inUse) {
      throw new ConflictException({
        code: 'UNIT_IN_USE',
        message: 'This unit is used by at least one product and cannot be deleted.',
      });
    }
    await this.db
      .deleteFrom('units')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }

  listConversions(organizationId: string) {
    return this.db
      .selectFrom('unit_conversions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .execute();
  }

  async createConversion(organizationId: string, dto: CreateUnitConversionDto) {
    return this.db
      .insertInto('unit_conversions')
      .values({
        organization_id: organizationId,
        from_unit_id: dto.fromUnitId,
        to_unit_id: dto.toUnitId,
        factor: dto.factor.toString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
