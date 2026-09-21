/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ---- Custom Fields (entity-agnostic — see docs/configuration.md) ----
  pgm.createTable('custom_field_definitions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    entity_type: { type: 'text', notNull: true },
    field_key: { type: 'text', notNull: true },
    label: { type: 'text', notNull: true },
    // TEXT, NUMBER, DECIMAL, CURRENCY, DATE, DATETIME, BOOLEAN, DROPDOWN, MULTI_SELECT, URL
    field_type: { type: 'text', notNull: true },
    options: { type: 'jsonb', notNull: true, default: '[]' },
    is_required: { type: 'boolean', notNull: true, default: false },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('custom_field_definitions', 'custom_field_definitions_unique', {
    unique: ['organization_id', 'entity_type', 'field_key'],
  });

  pgm.createTable('custom_field_values', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'uuid', notNull: true },
    field_key: { type: 'text', notNull: true },
    value: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('custom_field_values', 'custom_field_values_unique', {
    unique: ['organization_id', 'entity_type', 'entity_id', 'field_key'],
  });
  pgm.createIndex('custom_field_values', ['organization_id', 'entity_type', 'entity_id']);

  // ---- Tax Engine ----
  pgm.createTable('tax_categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('tax_categories', 'tax_categories_org_code_unique', { unique: ['organization_id', 'code'] });

  pgm.createTable('tax_rates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    tax_category_id: { type: 'uuid', notNull: true, references: 'tax_categories', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    rate_percent: { type: 'numeric(6,3)', notNull: true, check: 'rate_percent >= 0' },
    is_default: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('tax_rates', ['organization_id', 'tax_category_id']);

  pgm.addColumn('products', {
    tax_category_id: { type: 'uuid', references: 'tax_categories', onDelete: 'SET NULL' },
  });

  // ---- Pricing Engine ----
  pgm.createTable('price_lists', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    // GENERAL, CUSTOMER, WAREHOUSE
    scope: { type: 'text', notNull: true, default: 'GENERAL' },
    customer_id: { type: 'uuid', references: 'customers', onDelete: 'CASCADE' },
    warehouse_id: { type: 'uuid', references: 'warehouses', onDelete: 'CASCADE' },
    priority: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('price_lists', ['organization_id', 'customer_id']);
  pgm.createIndex('price_lists', ['organization_id', 'warehouse_id']);

  pgm.createTable('price_list_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    price_list_id: { type: 'uuid', notNull: true, references: 'price_lists', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    price: { type: 'numeric(18,4)', notNull: true, check: 'price >= 0' },
  });
  pgm.addConstraint('price_list_items', 'price_list_items_unique', {
    unique: ['price_list_id', 'product_id'],
  });

  // ---- Notifications ----
  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    // null user_id = organization-wide broadcast (e.g. low stock, visible to anyone with inventory.view)
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    type: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    entity_type: { type: 'text' },
    entity_id: { type: 'uuid' },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('notifications', ['organization_id', 'user_id', 'is_read']);

  // ---- Workflow: amount-threshold purchase approval rules ----
  pgm.createTable('purchase_approval_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    min_amount: { type: 'numeric(18,4)', notNull: true, default: 0 },
    required_permission: { type: 'text', notNull: true, default: 'purchase.approve' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('purchase_approval_rules', ['organization_id', 'min_amount']);
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_approval_rules');
  pgm.dropTable('notifications');
  pgm.dropTable('price_list_items');
  pgm.dropTable('price_lists');
  pgm.dropColumn('products', 'tax_category_id');
  pgm.dropTable('tax_rates');
  pgm.dropTable('tax_categories');
  pgm.dropTable('custom_field_values');
  pgm.dropTable('custom_field_definitions');
};
