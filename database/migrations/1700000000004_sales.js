/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('customers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    email: { type: 'text' },
    phone: { type: 'text' },
    credit_limit: { type: 'numeric(18,4)', notNull: true, default: 0 },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('customers', 'customers_org_code_unique', { unique: ['organization_id', 'code'] });
  pgm.createIndex('customers', 'name', { method: 'gin', opclass: 'gin_trgm_ops' });

  // DRAFT -> CONFIRMED (reserves stock) -> PARTIALLY_DISPATCHED -> DISPATCHED
  //                                     \-> CANCELLED (releases reservation)
  pgm.createTable('sales_orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    so_number: { type: 'text', notNull: true },
    customer_id: { type: 'uuid', notNull: true, references: 'customers' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    status: { type: 'text', notNull: true, default: 'DRAFT' },
    order_date: { type: 'date', notNull: true, default: pgm.func('current_date') },
    notes: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    confirmed_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    confirmed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('sales_orders', 'sales_orders_org_number_unique', { unique: ['organization_id', 'so_number'] });
  pgm.createIndex('sales_orders', ['organization_id', 'status']);
  pgm.createIndex('sales_orders', ['organization_id', 'customer_id']);

  pgm.createTable('sales_order_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    sales_order_id: { type: 'uuid', notNull: true, references: 'sales_orders', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    quantity_ordered: { type: 'numeric(18,4)', notNull: true, check: 'quantity_ordered > 0' },
    quantity_reserved: { type: 'numeric(18,4)', notNull: true, default: 0 },
    quantity_dispatched: { type: 'numeric(18,4)', notNull: true, default: 0 },
    unit_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('sales_order_items', ['organization_id', 'sales_order_id']);

  pgm.createTable('sales_dispatches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    sales_order_id: { type: 'uuid', notNull: true, references: 'sales_orders' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    dispatch_number: { type: 'text', notNull: true },
    notes: { type: 'text' },
    dispatched_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    dispatched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('sales_dispatches', 'sales_dispatches_org_number_unique', {
    unique: ['organization_id', 'dispatch_number'],
  });
  pgm.createIndex('sales_dispatches', ['organization_id', 'sales_order_id']);

  pgm.createTable('sales_dispatch_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    sales_dispatch_id: { type: 'uuid', notNull: true, references: 'sales_dispatches', onDelete: 'CASCADE' },
    sales_order_item_id: { type: 'uuid', notNull: true, references: 'sales_order_items' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    batch_id: { type: 'uuid', references: 'batches' },
    quantity: { type: 'numeric(18,4)', notNull: true, check: 'quantity > 0' },
    unit_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
  });
  pgm.createIndex('sales_dispatch_items', ['organization_id', 'sales_dispatch_id']);

  pgm.createTable('sales_returns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    return_number: { type: 'text', notNull: true },
    customer_id: { type: 'uuid', notNull: true, references: 'customers' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    sales_order_id: { type: 'uuid', references: 'sales_orders' },
    reason: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'COMPLETED' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('sales_returns', 'sales_returns_org_number_unique', { unique: ['organization_id', 'return_number'] });

  pgm.createTable('sales_return_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    sales_return_id: { type: 'uuid', notNull: true, references: 'sales_returns', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    batch_id: { type: 'uuid', references: 'batches' },
    quantity: { type: 'numeric(18,4)', notNull: true, check: 'quantity > 0' },
    unit_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('sales_return_items');
  pgm.dropTable('sales_returns');
  pgm.dropTable('sales_dispatch_items');
  pgm.dropTable('sales_dispatches');
  pgm.dropTable('sales_order_items');
  pgm.dropTable('sales_orders');
  pgm.dropTable('customers');
};
