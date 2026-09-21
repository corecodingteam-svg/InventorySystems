/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('suppliers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    email: { type: 'text' },
    phone: { type: 'text' },
    payment_terms: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('suppliers', 'suppliers_org_code_unique', { unique: ['organization_id', 'code'] });
  pgm.createIndex('suppliers', 'name', { method: 'gin', opclass: 'gin_trgm_ops' });

  // DRAFT -> PENDING_APPROVAL -> APPROVED -> PARTIALLY_RECEIVED -> RECEIVED
  //                                       \-> CANCELLED
  pgm.createTable('purchase_orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    po_number: { type: 'text', notNull: true },
    supplier_id: { type: 'uuid', notNull: true, references: 'suppliers' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    status: { type: 'text', notNull: true, default: 'DRAFT' },
    order_date: { type: 'date', notNull: true, default: pgm.func('current_date') },
    expected_date: { type: 'date' },
    notes: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    approved_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    approved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('purchase_orders', 'purchase_orders_org_number_unique', {
    unique: ['organization_id', 'po_number'],
  });
  pgm.createIndex('purchase_orders', ['organization_id', 'status']);
  pgm.createIndex('purchase_orders', ['organization_id', 'supplier_id']);

  pgm.createTable('purchase_order_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    purchase_order_id: { type: 'uuid', notNull: true, references: 'purchase_orders', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    quantity_ordered: { type: 'numeric(18,4)', notNull: true, check: 'quantity_ordered > 0' },
    quantity_received: { type: 'numeric(18,4)', notNull: true, default: 0 },
    unit_cost: { type: 'numeric(18,4)', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('purchase_order_items', ['organization_id', 'purchase_order_id']);

  pgm.createTable('goods_receipts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    purchase_order_id: { type: 'uuid', notNull: true, references: 'purchase_orders' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    receipt_number: { type: 'text', notNull: true },
    notes: { type: 'text' },
    received_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    received_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('goods_receipts', 'goods_receipts_org_number_unique', {
    unique: ['organization_id', 'receipt_number'],
  });
  pgm.createIndex('goods_receipts', ['organization_id', 'purchase_order_id']);

  pgm.createTable('goods_receipt_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    goods_receipt_id: { type: 'uuid', notNull: true, references: 'goods_receipts', onDelete: 'CASCADE' },
    purchase_order_item_id: { type: 'uuid', notNull: true, references: 'purchase_order_items' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    batch_id: { type: 'uuid', references: 'batches' },
    quantity_received: { type: 'numeric(18,4)', notNull: true, check: 'quantity_received > 0' },
    unit_cost: { type: 'numeric(18,4)', notNull: true, default: 0 },
  });
  pgm.createIndex('goods_receipt_items', ['organization_id', 'goods_receipt_id']);

  pgm.createTable('purchase_returns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    return_number: { type: 'text', notNull: true },
    supplier_id: { type: 'uuid', notNull: true, references: 'suppliers' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    purchase_order_id: { type: 'uuid', references: 'purchase_orders' },
    reason: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'COMPLETED' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('purchase_returns', 'purchase_returns_org_number_unique', {
    unique: ['organization_id', 'return_number'],
  });

  pgm.createTable('purchase_return_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    purchase_return_id: { type: 'uuid', notNull: true, references: 'purchase_returns', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    batch_id: { type: 'uuid', references: 'batches' },
    quantity: { type: 'numeric(18,4)', notNull: true, check: 'quantity > 0' },
    unit_cost: { type: 'numeric(18,4)', notNull: true, default: 0 },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_return_items');
  pgm.dropTable('purchase_returns');
  pgm.dropTable('goods_receipt_items');
  pgm.dropTable('goods_receipts');
  pgm.dropTable('purchase_order_items');
  pgm.dropTable('purchase_orders');
  pgm.dropTable('suppliers');
};
