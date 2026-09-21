/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ---- Stock Counting ----
  pgm.createTable('stock_counts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    count_number: { type: 'text', notNull: true },
    warehouse_id: { type: 'uuid', notNull: true, references: 'warehouses' },
    // FULL, CYCLE
    count_type: { type: 'text', notNull: true, default: 'CYCLE' },
    // DRAFT -> IN_PROGRESS -> SUBMITTED -> APPROVED, or CANCELLED
    status: { type: 'text', notNull: true, default: 'DRAFT' },
    notes: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    submitted_at: { type: 'timestamptz' },
    approved_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    approved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('stock_counts', 'stock_counts_org_number_unique', { unique: ['organization_id', 'count_number'] });
  pgm.createIndex('stock_counts', ['organization_id', 'warehouse_id', 'status']);

  pgm.createTable('stock_count_lines', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    stock_count_id: { type: 'uuid', notNull: true, references: 'stock_counts', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products' },
    variant_id: { type: 'uuid', references: 'product_variants' },
    // Snapshotted from stock_balances when the line is created — never
    // recomputed later, so a count reflects what was on the books at count
    // time even if other transactions post afterward.
    system_quantity: { type: 'numeric(18,4)', notNull: true, default: 0 },
    counted_quantity: { type: 'numeric(18,4)' },
    counted_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    counted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('stock_count_lines', 'stock_count_lines_unique', {
    unique: ['stock_count_id', 'product_id', 'variant_id'],
  });
  pgm.createIndex('stock_count_lines', ['organization_id', 'stock_count_id']);

  // ---- Idempotency (master spec §81) ----
  // Stores the response of a critical write the first time it's executed
  // under a given Idempotency-Key, so a mobile client retrying after a
  // dropped connection gets the original result instead of double-posting.
  pgm.createTable('idempotency_keys', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations', onDelete: 'CASCADE' },
    idempotency_key: { type: 'text', notNull: true },
    route: { type: 'text', notNull: true },
    status_code: { type: 'integer', notNull: true },
    response_body: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('idempotency_keys', 'idempotency_keys_unique', {
    unique: ['organization_id', 'idempotency_key', 'route'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('idempotency_keys');
  pgm.dropTable('stock_count_lines');
  pgm.dropTable('stock_counts');
};
