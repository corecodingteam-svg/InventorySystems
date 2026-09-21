import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { sql } from 'kysely';
import { KYSELY, Db } from '../database/database.module';
import { ListQueryDto, paginate, resolveSortColumn } from '../common/pagination/list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SORTABLE = { fullName: 'full_name', email: 'email', createdAt: 'created_at' };

@Injectable()
export class UsersService {
  constructor(@Inject(KYSELY) private db: Db) {}

  async list(organizationId: string, query: ListQueryDto) {
    const sortColumn = resolveSortColumn(query.sortBy, SORTABLE, 'created_at');
    let builder = this.db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'status', 'created_at'])
      .where('organization_id', '=', organizationId)
      .where('deleted_at', 'is', null);

    if (query.search) {
      builder = builder.where((eb) =>
        eb.or([
          eb('email', 'ilike', `%${query.search}%`),
          eb('full_name', 'ilike', `%${query.search}%`),
        ]),
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
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'status', 'created_at'])
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('email', '=', dto.email.toLowerCase())
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({
        code: 'USER_EXISTS',
        message: 'A user with this email already exists in this organization.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.db
      .insertInto('users')
      .values({
        organization_id: organizationId,
        email: dto.email.toLowerCase(),
        password_hash: passwordHash,
        full_name: dto.fullName,
        status: 'active',
      })
      .returning(['id', 'email', 'full_name', 'status', 'created_at'])
      .executeTakeFirstOrThrow();
    return user;
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(organizationId, id);
    return this.db
      .updateTable('users')
      .set({
        ...(dto.fullName ? { full_name: dto.fullName } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updated_at: sql`now()`,
      })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returning(['id', 'email', 'full_name', 'status', 'created_at'])
      .executeTakeFirstOrThrow();
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.db
      .updateTable('users')
      .set({ deleted_at: new Date() })
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .execute();
    return { success: true };
  }
}
