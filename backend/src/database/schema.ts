import { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface OrganizationsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  status: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface UsersTable {
  id: Generated<string>;
  organization_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  status: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface RolesTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  is_system: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PermissionsTable {
  id: Generated<string>;
  code: string;
  description: string;
}

export interface RolePermissionsTable {
  role_id: string;
  permission_id: string;
}

export interface UserRolesTable {
  user_id: string;
  role_id: string;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface AuditLogsTable {
  id: Generated<string>;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: unknown | null;
  new_value: unknown | null;
  ip_address: string | null;
  created_at: Generated<Timestamp>;
}

export interface UnitsTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  code: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface UnitConversionsTable {
  id: Generated<string>;
  organization_id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: string;
  created_at: Generated<Timestamp>;
}

export interface CategoriesTable {
  id: Generated<string>;
  organization_id: string;
  parent_id: string | null;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface BrandsTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface WarehousesTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  code: string;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface LocationsTable {
  id: Generated<string>;
  organization_id: string;
  warehouse_id: string;
  parent_id: string | null;
  name: string;
  code: string;
  location_type: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ProductsTable {
  id: Generated<string>;
  organization_id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  base_unit_id: string;
  barcode: string | null;
  product_type: Generated<string>;
  cost_price: Generated<string>;
  selling_price: Generated<string>;
  track_batches: Generated<boolean>;
  track_serials: Generated<boolean>;
  allow_negative_stock: Generated<boolean>;
  reorder_point: Generated<string>;
  status: Generated<string>;
  tax_category_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface ProductVariantsTable {
  id: Generated<string>;
  organization_id: string;
  product_id: string;
  sku: string;
  attributes: Generated<unknown>;
  barcode: string | null;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface BatchesTable {
  id: Generated<string>;
  organization_id: string;
  product_id: string;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SerialNumbersTable {
  id: Generated<string>;
  organization_id: string;
  product_id: string;
  serial_number: string;
  status: Generated<string>;
  warehouse_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface StockLedgerTable {
  id: Generated<string>;
  organization_id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  location_id: string | null;
  batch_id: string | null;
  serial_number_id: string | null;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  quantity_in: Generated<string>;
  quantity_out: Generated<string>;
  unit_cost: Generated<string>;
  balance_quantity: string;
  notes: string | null;
  created_by: string | null;
  created_at: Generated<Timestamp>;
}

export interface StockBalancesTable {
  id: Generated<string>;
  organization_id: string;
  product_id: string;
  variant_id: Generated<string>;
  warehouse_id: string;
  location_id: Generated<string>;
  batch_id: Generated<string>;
  on_hand: Generated<string>;
  reserved: Generated<string>;
  updated_at: Generated<Timestamp>;
}

export interface SuppliersTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  payment_terms: string | null;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PurchaseOrdersTable {
  id: Generated<string>;
  organization_id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  status: Generated<string>;
  order_date: Generated<Timestamp>;
  expected_date: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PurchaseOrderItemsTable {
  id: Generated<string>;
  organization_id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_ordered: string;
  quantity_received: Generated<string>;
  unit_cost: Generated<string>;
  created_at: Generated<Timestamp>;
}

export interface GoodsReceiptsTable {
  id: Generated<string>;
  organization_id: string;
  purchase_order_id: string;
  warehouse_id: string;
  receipt_number: string;
  notes: string | null;
  received_by: string | null;
  received_at: Generated<Timestamp>;
}

export interface GoodsReceiptItemsTable {
  id: Generated<string>;
  organization_id: string;
  goods_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string | null;
  quantity_received: string;
  unit_cost: Generated<string>;
}

export interface PurchaseReturnsTable {
  id: Generated<string>;
  organization_id: string;
  return_number: string;
  supplier_id: string;
  warehouse_id: string;
  purchase_order_id: string | null;
  reason: string | null;
  status: Generated<string>;
  created_by: string | null;
  created_at: Generated<Timestamp>;
}

export interface PurchaseReturnItemsTable {
  id: Generated<string>;
  organization_id: string;
  purchase_return_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string | null;
  quantity: string;
  unit_cost: Generated<string>;
}

export interface CustomersTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  credit_limit: Generated<string>;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SalesOrdersTable {
  id: Generated<string>;
  organization_id: string;
  so_number: string;
  customer_id: string;
  warehouse_id: string;
  status: Generated<string>;
  order_date: Generated<Timestamp>;
  notes: string | null;
  created_by: string | null;
  confirmed_by: string | null;
  confirmed_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SalesOrderItemsTable {
  id: Generated<string>;
  organization_id: string;
  sales_order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_ordered: string;
  quantity_reserved: Generated<string>;
  quantity_dispatched: Generated<string>;
  unit_price: Generated<string>;
  created_at: Generated<Timestamp>;
}

export interface SalesDispatchesTable {
  id: Generated<string>;
  organization_id: string;
  sales_order_id: string;
  warehouse_id: string;
  dispatch_number: string;
  notes: string | null;
  dispatched_by: string | null;
  dispatched_at: Generated<Timestamp>;
}

export interface SalesDispatchItemsTable {
  id: Generated<string>;
  organization_id: string;
  sales_dispatch_id: string;
  sales_order_item_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string | null;
  quantity: string;
  unit_price: Generated<string>;
}

export interface SalesReturnsTable {
  id: Generated<string>;
  organization_id: string;
  return_number: string;
  customer_id: string;
  warehouse_id: string;
  sales_order_id: string | null;
  reason: string | null;
  status: Generated<string>;
  created_by: string | null;
  created_at: Generated<Timestamp>;
}

export interface SalesReturnItemsTable {
  id: Generated<string>;
  organization_id: string;
  sales_return_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string | null;
  quantity: string;
  unit_price: Generated<string>;
}

export interface CustomFieldDefinitionsTable {
  id: Generated<string>;
  organization_id: string;
  entity_type: string;
  field_key: string;
  label: string;
  field_type: string;
  options: Generated<unknown>;
  is_required: Generated<boolean>;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface CustomFieldValuesTable {
  id: Generated<string>;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  field_key: string;
  value: unknown | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface TaxCategoriesTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  code: string;
  created_at: Generated<Timestamp>;
}

export interface TaxRatesTable {
  id: Generated<string>;
  organization_id: string;
  tax_category_id: string;
  name: string;
  rate_percent: string;
  is_default: Generated<boolean>;
  created_at: Generated<Timestamp>;
}

export interface PriceListsTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  scope: Generated<string>;
  customer_id: string | null;
  warehouse_id: string | null;
  priority: Generated<number>;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PriceListItemsTable {
  id: Generated<string>;
  organization_id: string;
  price_list_id: string;
  product_id: string;
  price: string;
}

export interface NotificationsTable {
  id: Generated<string>;
  organization_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: Generated<boolean>;
  created_at: Generated<Timestamp>;
}

export interface PurchaseApprovalRulesTable {
  id: Generated<string>;
  organization_id: string;
  name: string;
  min_amount: Generated<string>;
  required_permission: Generated<string>;
  created_at: Generated<Timestamp>;
}

export interface StockCountsTable {
  id: Generated<string>;
  organization_id: string;
  count_number: string;
  warehouse_id: string;
  count_type: Generated<string>;
  status: Generated<string>;
  notes: string | null;
  created_by: string | null;
  submitted_at: Timestamp | null;
  approved_by: string | null;
  approved_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface StockCountLinesTable {
  id: Generated<string>;
  organization_id: string;
  stock_count_id: string;
  product_id: string;
  variant_id: string | null;
  system_quantity: Generated<string>;
  counted_quantity: string | null;
  counted_by: string | null;
  counted_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface IdempotencyKeysTable {
  id: Generated<string>;
  organization_id: string;
  idempotency_key: string;
  route: string;
  status_code: number;
  response_body: unknown;
  created_at: Generated<Timestamp>;
}

export interface PosRegistersTable {
  id: Generated<string>;
  organization_id: string;
  warehouse_id: string;
  name: string;
  code: string;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
}

export interface PosSessionsTable {
  id: Generated<string>;
  organization_id: string;
  register_id: string;
  opened_by: string | null;
  opening_cash: Generated<string>;
  closed_by: string | null;
  closing_cash: string | null;
  expected_cash: string | null;
  status: Generated<string>;
  opened_at: Generated<Timestamp>;
  closed_at: Timestamp | null;
}

export interface PosSalesTable {
  id: Generated<string>;
  organization_id: string;
  session_id: string;
  sale_number: string;
  customer_id: string | null;
  subtotal: Generated<string>;
  discount_amount: Generated<string>;
  tax_amount: Generated<string>;
  total_amount: Generated<string>;
  status: Generated<string>;
  created_by: string | null;
  created_at: Generated<Timestamp>;
}

export interface PosSaleItemsTable {
  id: Generated<string>;
  organization_id: string;
  pos_sale_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: string;
  unit_price: Generated<string>;
  discount_amount: Generated<string>;
}

export interface PosSalePaymentsTable {
  id: Generated<string>;
  organization_id: string;
  pos_sale_id: string;
  method: string;
  amount: string;
}

export interface WebhookSubscriptionsTable {
  id: Generated<string>;
  organization_id: string;
  url: string;
  event_types: Generated<unknown>;
  secret: string;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
}

export interface WebhookDeliveriesTable {
  id: Generated<string>;
  organization_id: string;
  webhook_subscription_id: string;
  event_type: string;
  payload: unknown;
  status: Generated<string>;
  attempts: Generated<number>;
  last_error: string | null;
  created_at: Generated<Timestamp>;
  delivered_at: Timestamp | null;
}

export interface IntegrationConnectionsTable {
  id: Generated<string>;
  organization_id: string;
  provider: string;
  name: string;
  config: Generated<unknown>;
  status: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SubscriptionsTable {
  id: Generated<string>;
  organization_id: string;
  plan: Generated<string>;
  status: Generated<string>;
  seats: Generated<number>;
  current_period_end: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface Database {
  organizations: OrganizationsTable;
  users: UsersTable;
  roles: RolesTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  user_roles: UserRolesTable;
  refresh_tokens: RefreshTokensTable;
  audit_logs: AuditLogsTable;
  units: UnitsTable;
  unit_conversions: UnitConversionsTable;
  categories: CategoriesTable;
  brands: BrandsTable;
  warehouses: WarehousesTable;
  locations: LocationsTable;
  products: ProductsTable;
  product_variants: ProductVariantsTable;
  batches: BatchesTable;
  serial_numbers: SerialNumbersTable;
  stock_ledger: StockLedgerTable;
  stock_balances: StockBalancesTable;
  suppliers: SuppliersTable;
  purchase_orders: PurchaseOrdersTable;
  purchase_order_items: PurchaseOrderItemsTable;
  goods_receipts: GoodsReceiptsTable;
  goods_receipt_items: GoodsReceiptItemsTable;
  purchase_returns: PurchaseReturnsTable;
  purchase_return_items: PurchaseReturnItemsTable;
  customers: CustomersTable;
  sales_orders: SalesOrdersTable;
  sales_order_items: SalesOrderItemsTable;
  sales_dispatches: SalesDispatchesTable;
  sales_dispatch_items: SalesDispatchItemsTable;
  sales_returns: SalesReturnsTable;
  sales_return_items: SalesReturnItemsTable;
  custom_field_definitions: CustomFieldDefinitionsTable;
  custom_field_values: CustomFieldValuesTable;
  tax_categories: TaxCategoriesTable;
  tax_rates: TaxRatesTable;
  price_lists: PriceListsTable;
  price_list_items: PriceListItemsTable;
  notifications: NotificationsTable;
  purchase_approval_rules: PurchaseApprovalRulesTable;
  stock_counts: StockCountsTable;
  stock_count_lines: StockCountLinesTable;
  idempotency_keys: IdempotencyKeysTable;
  pos_registers: PosRegistersTable;
  pos_sessions: PosSessionsTable;
  pos_sales: PosSalesTable;
  pos_sale_items: PosSaleItemsTable;
  pos_sale_payments: PosSalePaymentsTable;
  webhook_subscriptions: WebhookSubscriptionsTable;
  webhook_deliveries: WebhookDeliveriesTable;
  integration_connections: IntegrationConnectionsTable;
  subscriptions: SubscriptionsTable;
}
