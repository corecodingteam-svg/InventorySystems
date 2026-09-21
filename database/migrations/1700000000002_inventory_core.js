/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ---- Units ----
  pgm.createTable('units', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('units', 'units_org_code_unique', { unique: ['organization_id', 'code'] });

  pgm.createTable('unit_conversions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    from_unit_id: { type: 'uuid', notNull: true, references: 'units', onDelete: 'CASCADE' },
    to_unit_id: { type: 'uuid', notNull: true, references: 'units', onDelete: 'CASCADE' },
    // quantity in from_unit * factor = quantity in to_unit (e.g. Carton -> Box factor 10)
    factor: { type: 'numeric(18,6)', notNull: true, check: 'factor > 0' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('unit_conversions', 'unit_conversions_pair_unique', {
    unique: ['organization_id', 'from_unit_id', 'to_unit_id'],
  });

  // ---- Categories / Brands ----
  pgm.createTable('categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    parent_id: { type: 'uuid', references: 'categories', onDelete: 'SET NULL' },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('categories', ['organization_id']);

  pgm.createTable('brands', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('brands', ['organization_id']);

  // ---- Warehouses / Locations ----
  pgm.createTable('warehouses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('warehouses', 'warehouses_org_code_unique', { unique: ['organization_id', 'code'] });

  pgm.createTable('locations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses', onDelete: 'CASCADE' },
    parent_id: { type: 'uuid', references: 'locations', onDelete: 'SET NULL' },
    name: { type: 'text', notNull: true },
    code: { type: 'text', notNull: true },
    // ZONE, RACK, SHELF, BIN, RECEIVING, DISPATCH, RETURNS, DAMAGED, QUARANTINE
    location_type: { type: 'text', notNull: true, default: 'BIN' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('locations', 'locations_warehouse_code_unique', { unique: ['warehouse_id', 'code'] });
  pgm.createIndex('locations', ['organization_id', 'warehouse_id']);

  // ---- Products / Variants ----
  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    sku: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    category_id: { type: 'uuid', references: 'categories', onDelete: 'SET NULL' },
    brand_id: { type: 'uuid', references: 'brands', onDelete: 'SET NULL' },
    base_unit_id: { type: 'uuid', notNull: true, references: 'units' },
    barcode: { type: 'text' },
    // PHYSICAL, SERVICE, DIGITAL, BUNDLE, KIT, RAW_MATERIAL, FINISHED_GOOD, SEMI_FINISHED, CONSUMABLE, ASSET, SPARE_PART
    product_type: { type: 'text', notNull: true, default: 'PHYSICAL' },
    cost_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
    selling_price: { type: 'numeric(18,4)', notNull: true, default: 0 },
    track_batches: { type: 'boolean', notNull: true, default: false },
    track_serials: { type: 'boolean', notNull: true, default: false },
    allow_negative_stock: { type: 'boolean', notNull: true, default: false },
    reorder_point: { type: 'numeric(18,4)', notNull: true, default: 0 },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('products', 'products_org_sku_unique', { unique: ['organization_id', 'sku'] });
  pgm.createIndex('products', ['organization_id']);
  pgm.createIndex('products', 'name', { method: 'gin', opclass: 'gin_trgm_ops' });
  pgm.createIndex('products', ['organization_id', 'barcode']);

  pgm.createTable('product_variants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    sku: { type: 'text', notNull: true },
    // e.g. {"color": "Red", "size": "M"} - configurable attributes, not hard-coded columns
    attributes: { type: 'jsonb', notNull: true, default: '{}' },
    barcode: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('product_variants', 'product_variants_org_sku_unique', { unique: ['organization_id', 'sku'] });
  pgm.createIndex('product_variants', ['organization_id', 'product_id']);

  // ---- Batches / Serial Numbers ----
  pgm.createTable('batches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    batch_number: { type: 'text', notNull: true },
    manufacture_date: { type: 'date' },
    expiry_date: { type: 'date' },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('batches', 'batches_org_product_number_unique', {
    unique: ['organization_id', 'product_id', 'batch_number'],
  });
  pgm.createIndex('batches', ['organization_id', 'expiry_date']);

  pgm.createTable('serial_numbers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    serial_number: { type: 'text', notNull: true },
    // IN_STOCK, RESERVED, SOLD, DAMAGED, RETURNED
    status: { type: 'text', notNull: true, default: 'IN_STOCK' },
    warehouse_id: { type: 'uuid', references: 'warehouses', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('serial_numbers', 'serial_numbers_org_product_serial_unique', {
    unique: ['organization_id', 'product_id', 'serial_number'],
  });

  // ---- Stock Ledger (authoritative, append-only) + Stock Balances (derived cache) ----
  pgm.createTable('stock_ledger', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    location_id: { type: 'uuid', references: 'locations' },
    batch_id: { type: 'uuid', references: 'batches' },
    serial_number_id: { type: 'uuid', references: 'serial_numbers' },
    transaction_type: { type: 'text', notNull: true },
    reference_type: { type: 'text' },
    reference_id: { type: 'uuid' },
    quantity_in: { type: 'numeric(18,4)', notNull: true, default: 0 },
    quantity_out: { type: 'numeric(18,4)', notNull: true, default: 0 },
    unit_cost: { type: 'numeric(18,4)', notNull: true, default: 0 },
    balance_quantity: { type: 'numeric(18,4)', notNull: true },
    notes: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('stock_ledger', ['organization_id', 'product_id', 'warehouse_id', 'created_at']);
  pgm.createIndex('stock_ledger', ['organization_id', 'reference_type', 'reference_id']);

  // Derived/cached projection of current stock, reconcilable from stock_ledger.
  // One row per (product, variant, warehouse, location, batch) combination actually stocked.
  //
  // variant_id/location_id/batch_id are plain (non-FK) uuid columns defaulted to the nil UUID
  // rather than NULL: Postgres unique constraints treat NULL as distinct-from-NULL, which would
  // silently allow duplicate balance rows for "no variant / no location / no batch" slots and
  // break the row-locking the inventory engine relies on. FK enforcement for the real values is
  // done at the application layer via stock_ledger's proper FK columns instead.
  pgm.createTable('stock_balances', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', notNull: true, default: '00000000-0000-0000-0000-000000000000' },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    location_id: { type: 'uuid', notNull: true, default: '00000000-0000-0000-0000-000000000000' },
    batch_id: { type: 'uuid', notNull: true, default: '00000000-0000-0000-0000-000000000000' },
    on_hand: { type: 'numeric(18,4)', notNull: true, default: 0 },
    reserved: { type: 'numeric(18,4)', notNull: true, default: 0 },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('stock_balances', 'stock_balances_unique_slot', {
    unique: ['organization_id', 'product_id', 'variant_id', 'warehouse_id', 'location_id', 'batch_id'],
  });
  pgm.createIndex('stock_balances', ['organization_id', 'warehouse_id', 'product_id']);
  pgm.addConstraint('stock_balances', 'stock_balances_on_hand_check', { check: 'on_hand >= 0' });
};

exports.down = (pgm) => {
  pgm.dropTable('stock_balances');
  pgm.dropTable('stock_ledger');
  pgm.dropTable('serial_numbers');
  pgm.dropTable('batches');
  pgm.dropTable('product_variants');
  pgm.dropTable('products');
  pgm.dropTable('locations');
  pgm.dropTable('warehouses');
  pgm.dropTable('brands');
  pgm.dropTable('categories');
  pgm.dropTable('unit_conversions');
  pgm.dropTable('units');
};
