import { Db } from '../database/database.module';

/** Shared by PermissionsGuard and any service that needs a dynamic (non-decorator) permission check — e.g. workflow rules. */
export async function userHasPermission(db: Db, userId: string, code: string): Promise<boolean> {
  const row = await db
    .selectFrom('user_roles')
    .innerJoin('role_permissions', 'role_permissions.role_id', 'user_roles.role_id')
    .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
    .select('permissions.code')
    .where('user_roles.user_id', '=', userId)
    .where('permissions.code', '=', code)
    .executeTakeFirst();
  return !!row;
}
