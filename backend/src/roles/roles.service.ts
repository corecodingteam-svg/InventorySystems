import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';

export class CreateRoleInput {
  name: string;
  permissionCodes: string[] = [];
}

@Injectable()
export class RolesService {
  constructor(@Inject(KYSELY) private db: Db) {}

  listPermissions() {
    return this.db.selectFrom('permissions').selectAll().orderBy('code', 'asc').execute();
  }

  async listRoles(organizationId: string) {
    return this.db
      .selectFrom('roles')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  async createRole(organizationId: string, input: CreateRoleInput) {
    return this.db.transaction().execute(async (trx) => {
      const role = await trx
        .insertInto('roles')
        .values({ organization_id: organizationId, name: input.name, is_system: false })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (input.permissionCodes.length > 0) {
        const perms = await trx
          .selectFrom('permissions')
          .select('id')
          .where('code', 'in', input.permissionCodes)
          .execute();
        if (perms.length > 0) {
          await trx
            .insertInto('role_permissions')
            .values(perms.map((p) => ({ role_id: role.id, permission_id: p.id })))
            .execute();
        }
      }
      return role;
    });
  }

  async updateRolePermissions(
    organizationId: string,
    roleId: string,
    permissionCodes: string[],
  ) {
    const role = await this.db
      .selectFrom('roles')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', roleId)
      .executeTakeFirst();
    if (!role) throw new NotFoundException('Role not found.');

    return this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom('role_permissions').where('role_id', '=', roleId).execute();
      const perms = await trx
        .selectFrom('permissions')
        .select('id')
        .where('code', 'in', permissionCodes)
        .execute();
      if (perms.length > 0) {
        await trx
          .insertInto('role_permissions')
          .values(perms.map((p) => ({ role_id: roleId, permission_id: p.id })))
          .execute();
      }
      return { success: true };
    });
  }
}
