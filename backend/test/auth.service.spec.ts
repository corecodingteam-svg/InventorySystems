import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';

function makeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const chain: any = {
    selectFrom: jest.fn(() => chain),
    select: jest.fn(() => chain),
    selectAll: jest.fn(() => chain),
    where: jest.fn(() => chain),
    executeTakeFirst: jest.fn(async () => undefined),
    executeTakeFirstOrThrow: jest.fn(async () => ({})),
    execute: jest.fn(async () => []),
    insertInto: jest.fn(() => chain),
    values: jest.fn(() => chain),
    returningAll: jest.fn(() => chain),
    transaction: jest.fn(() => ({ execute: async (fn: any) => fn(chain) })),
    ...overrides,
  };
  return chain;
}

describe('AuthService.login', () => {
  it('rejects an unknown email without leaking whether the account exists', async () => {
    const db = makeDb({ executeTakeFirst: jest.fn(async () => undefined) });
    const service = new AuthService(
      db,
      new JwtService({ secret: 'test' }),
      new ConfigService({ JWT_SECRET: 'test' }),
    );

    await expect(service.login({ email: 'nobody@example.com', password: 'x' })).rejects.toThrow(
      'Invalid email or password.',
    );
  });

  it('rejects a wrong password for a known user', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const db = makeDb({
      executeTakeFirst: jest.fn(async () => ({
        id: 'user-1',
        organization_id: 'org-1',
        email: 'user@example.com',
        password_hash: passwordHash,
        status: 'active',
      })),
    });
    const service = new AuthService(
      db,
      new JwtService({ secret: 'test' }),
      new ConfigService({ JWT_SECRET: 'test' }),
    );

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toThrow('Invalid email or password.');
  });
});
