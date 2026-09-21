import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KYSELY, Db } from '../database/database.module';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(KYSELY) private db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    if (!user) throw new ForbiddenException('Not authenticated.');

    const rows = await this.db
      .selectFrom('user_roles')
      .innerJoin('role_permissions', 'role_permissions.role_id', 'user_roles.role_id')
      .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
      .select('permissions.code')
      .where('user_roles.user_id', '=', user.sub)
      .execute();

    const granted = new Set(rows.map((r) => r.code));
    const ok = required.every((code) => granted.has(code));
    if (!ok) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
      });
    }
    return true;
  }
}
