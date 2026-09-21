import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { KYSELY, Db } from '../database/database.module';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 7;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Used by the client to hide/disable actions the current user can't perform — see docs/authorization.md. */
  async getPermissions(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('user_roles')
      .innerJoin('role_permissions', 'role_permissions.role_id', 'user_roles.role_id')
      .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
      .select('permissions.code')
      .where('user_roles.user_id', '=', userId)
      .execute();
    return rows.map((r) => r.code);
  }

  private async issueTokens(userId: string, organizationId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, organizationId, email },
      { expiresIn: '15m' },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.db
      .insertInto('refresh_tokens')
      .values({
        user_id: userId,
        token_hash: hashToken(refreshToken),
        expires_at: expiresAt,
      })
      .execute();

    return { accessToken, refreshToken };
  }

  async registerOrganization(dto: RegisterOrganizationDto) {
    const slug = slugify(dto.organizationName);
    const existing = await this.db
      .selectFrom('organizations')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({
        code: 'ORGANIZATION_EXISTS',
        message: 'An organization with a similar name already exists.',
      });
    }

    const result = await this.db.transaction().execute(async (trx) => {
      const org = await trx
        .insertInto('organizations')
        .values({ name: dto.organizationName, slug, status: 'active' })
        .returningAll()
        .executeTakeFirstOrThrow();

      const passwordHash = await bcrypt.hash(dto.adminPassword, SALT_ROUNDS);
      const user = await trx
        .insertInto('users')
        .values({
          organization_id: org.id,
          email: dto.adminEmail.toLowerCase(),
          password_hash: passwordHash,
          full_name: dto.adminFullName,
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const role = await trx
        .insertInto('roles')
        .values({ organization_id: org.id, name: 'Organization Admin', is_system: true })
        .returningAll()
        .executeTakeFirstOrThrow();

      const allPermissions = await trx.selectFrom('permissions').select('id').execute();
      if (allPermissions.length > 0) {
        await trx
          .insertInto('role_permissions')
          .values(allPermissions.map((p) => ({ role_id: role.id, permission_id: p.id })))
          .execute();
      }

      await trx
        .insertInto('user_roles')
        .values({ user_id: user.id, role_id: role.id })
        .execute();

      return { org, user };
    });

    const tokens = await this.issueTokens(
      result.user.id,
      result.org.id,
      result.user.email,
    );
    return { organization: result.org, user: this.sanitizeUser(result.user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', dto.email.toLowerCase())
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    const tokens = await this.issueTokens(user.id, user.organization_id, user.email);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const candidates = await this.db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('revoked_at', 'is', null)
      .where('expires_at', '>', new Date())
      .execute();

    const match = candidates.find((c) => bcrypt.compareSync(refreshToken, c.token_hash));
    if (!match) throw new UnauthorizedException('Invalid or expired refresh token.');

    await this.db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('id', '=', match.id)
      .execute();

    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', match.user_id)
      .executeTakeFirstOrThrow();

    return this.issueTokens(user.id, user.organization_id, user.email);
  }

  async logout(refreshToken: string) {
    const candidates = await this.db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('revoked_at', 'is', null)
      .execute();
    const match = candidates.find((c) => bcrypt.compareSync(refreshToken, c.token_hash));
    if (match) {
      await this.db
        .updateTable('refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('id', '=', match.id)
        .execute();
    }
    return { success: true };
  }

  private sanitizeUser(user: any) {
    const { password_hash, ...rest } = user;
    return rest;
  }
}
