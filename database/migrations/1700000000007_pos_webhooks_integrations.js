/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ---- POS ----
  pgm.createTable('pos_registers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('pos_registers', 'pos_registers_org_code_unique', { unique: ['organization_id', 'code'] });

  // A register can only have one OPEN session at a time (enforced in
  // PosService, not by a partial unique index, to keep the migration
  // portable — see docs/pos.md).
  pgm.createTable('pos_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    register_id: { type: 'uuid', notNull: true, references: 'pos_registers' },
    opened_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    opening_cash: { type: 'numeric(18,4)', notNull: true, default: 0 },
    closed_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    closing_cash: { type: 'numeric(18,4)' },
    expected_cash: { type: 'numeric(18,4)' },
    status: { type: 'text', notNull: true, default: 'OPEN' },
    opened_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    closed_at: { type: 'timestamptz' },
  });
  pgm.createIndex('pos_sessions', ['organization_id', 'register_id', 'status']);

  pgm.createTable('pos_sales', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    session_id: { type: 'uuid', notNull: true, references: 'pos_sessions' },
    sale_number: { type: 'text', notNull: true },
    customer_id: { type: 'uuid', references: 'customers', onDelete: 'SET NULL' },
    subtotal: { type: 'numeric(18,4)', notNull: true, default: 0 },
    discount_amount: { type: 'numeric(18,4)', notNull: true, default: 0 },
    tax_amount: { type: 'numeric(18,4)', notNull: true, default: 0 },
    total_amount: { type: 'numeric(18,4)', notNull: true, default: 0 },
    // COMPLETED, VOIDED
    status: { type: 'text', notNull: true, default: 'COMPLETED' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('pos_sales', 'pos_sales_org_number_unique', { unique: ['organization_id', 'sale_number'] });
  pgm.createIndex('pos_sales', ['organization_id', 'session_id']);

  pgm.createTable('pos_sale_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    pos_sale_id: { type: 'uuid', notNull: true, references: 'pos_sales', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    quantity: { type: 'numeric(18,4)', notNull: true, check: 'quantity > 0' },
    unit_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
    discount_amount: { type: 'numeric(18,4)', notNull: true, default: 0 },
  });

  pgm.createTable('pos_sale_payments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    pos_sale_id: { type: 'uuid', notNull: true, references: 'pos_sales', onDelete: 'CASCADE' },
    // CASH, CARD, UPI, OTHER
    method: { type: 'text', notNull: true },
    amount: { type: 'numeric(18,4)', notNull: true, check: 'amount > 0' },
  });

  // ---- Webhooks ----
  pgm.createTable('webhook_subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    url: { type: 'text', notNull: true },
    event_types: { type: 'jsonb', notNull: true, default: '[]' },
    secret: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('webhook_subscriptions', ['organization_id', 'status']);

  pgm.createTable('webhook_deliveries', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    webhook_subscription_id: { type: 'uuid', notNull: true, references: 'webhook_subscriptions', onDelete: 'CASCADE' },
    event_type: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    // PENDING, DELIVERED, FAILED
    status: { type: 'text', notNull: true, default: 'PENDING' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    last_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    delivered_at: { type: 'timestamptz' },
  });
  pgm.createIndex('webhook_deliveries', ['organization_id', 'status']);

  // ---- Integration connections (abstraction only — see docs/integrations.md) ----
  pgm.createTable('integration_connections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    // e.g. SHOPIFY, WOOCOMMERCE, TALLY, ZOHO_BOOKS — a catalog key, not an enum,
    // so a new provider needs no migration.
    provider: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    config: { type: 'jsonb', notNull: true, default: '{}' },
    status: { type: 'text', notNull: true, default: 'disconnected' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('integration_connections', ['organization_id', 'provider']);

  // ---- Subscription (platform billing) architecture ----
  pgm.createTable('subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    // FREE, STARTER, PROFESSIONAL, ENTERPRISE — a catalog key, not an enum.
    plan: { type: 'text', notNull: true, default: 'FREE' },
    status: { type: 'text', notNull: true, default: 'active' },
    seats: { type: 'integer', notNull: true, default: 1 },
    current_period_end: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('subscriptions', 'subscriptions_org_unique', { unique: ['organization_id'] });
};

exports.down = (pgm) => {
  pgm.dropTable('subscriptions');
  pgm.dropTable('integration_connections');
  pgm.dropTable('webhook_deliveries');
  pgm.dropTable('webhook_subscriptions');
  pgm.dropTable('pos_sale_payments');
  pgm.dropTable('pos_sale_items');
  pgm.dropTable('pos_sales');
  pgm.dropTable('pos_sessions');
  pgm.dropTable('pos_registers');
};
