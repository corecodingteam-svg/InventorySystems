/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('pg_trgm', { ifNotExists: true });

  pgm.createTable('organizations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    slug: { type: 'text', notNull: true, unique: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
    },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    full_name: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('users', 'users_org_email_unique', {
    unique: ['organization_id', 'email'],
  });
  pgm.createIndex('users', ['organization_id']);
  pgm.createIndex('users', 'full_name', { method: 'gin', opclass: 'gin_trgm_ops' });

  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    is_system: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('roles', 'roles_org_name_unique', { unique: ['organization_id', 'name'] });

  pgm.createTable('permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'text', notNull: true, unique: true },
    description: { type: 'text', notNull: true },
  });

  pgm.createTable('role_permissions', {
    role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'CASCADE' },
    permission_id: {
      type: 'uuid',
      notNull: true,
      references: 'permissions',
      onDelete: 'CASCADE',
    },
  });
  pgm.addConstraint('role_permissions', 'role_permissions_pk', {
    primaryKey: ['role_id', 'permission_id'],
  });

  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('user_roles', 'user_roles_pk', { primaryKey: ['user_id', 'role_id'] });

  pgm.createTable('refresh_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('refresh_tokens', ['user_id']);

  pgm.createTable('audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    action: { type: 'text', notNull: true },
    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'uuid' },
    old_value: { type: 'jsonb' },
    new_value: { type: 'jsonb' },
    ip_address: { type: 'inet' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('audit_logs', ['organization_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('audit_logs');
  pgm.dropTable('refresh_tokens');
  pgm.dropTable('user_roles');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('users');
  pgm.dropTable('organizations');
};
