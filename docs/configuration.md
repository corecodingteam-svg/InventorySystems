# Configuration: Custom Fields, Tax, Pricing (Phase 7)

## Custom Fields

The mechanism that keeps the platform industry-agnostic (master spec §26): administrators define fields per entity type without any code change.

- `custom_field_definitions` — one row per field: `entity_type` (e.g. `"product"`, `"customer"`), `field_key`, `label`, `field_type` (`TEXT`, `NUMBER`, `DECIMAL`, `CURRENCY`, `DATE`, `DATETIME`, `BOOLEAN`, `DROPDOWN`, `MULTI_SELECT`, `URL`), `options` (for dropdown/multi-select), `is_required`, `sort_order`.
- `custom_field_values` — one row per `(entity_type, entity_id, field_key)`, value stored as JSONB so it can hold any of the above types without a column per type.
- `POST /custom-fields/values/:entityType` validates against the entity's definitions before writing: unknown keys are rejected, required fields must be present. This is enforced in `CustomFieldsService`, not left to the client.

`entity_type` is a free-text string, not a foreign key or enum — any current or future entity (`product`, `customer`, `supplier`, a Phase 9 module's own entity) can have custom fields defined for it without a migration. Custom **forms** (master spec §27 — field ordering/visibility/validation as a designed layout) are not built; today a form is just "the list of definitions for this entity type, in `sort_order`" and the Flutter client would render one field per definition.

## Tax Engine

`tax_categories` (e.g. "Standard Rate", "Exempt") each have one or more `tax_rates`, one of which is `is_default`. A `product.tax_category_id` links a product to a category; `TaxService.computeTaxForProduct()` looks up that category's default rate and returns `{ rate, taxAmount }` for a given line amount.

This is intentionally generic (a rate and a percentage), not GST/VAT-specific — nothing in the schema assumes India's CGST/SGST/IGST split or requires HSN/SAC codes, so a `tax_category` can equally represent a flat VAT rate or a US sales-tax rate. Composite taxes (e.g. GST's CGST+SGST split shown as two lines) would be modeled as two `tax_rates` under one category with an application-layer sum — not implemented yet, since no phase currently generates an invoice line that would render it.

## Pricing Engine

`price_lists` (scoped `GENERAL`, `CUSTOMER`, or `WAREHOUSE`, with a `priority` for tie-breaking) contain `price_list_items` (one price per product). `PricingService.resolvePrice(productId, { customerId, warehouseId })` picks the highest-precedence match: a customer-specific price list beats a warehouse-specific one, which beats a general one, which falls back to the product's own `selling_price` if nothing matches.

Not implemented: quantity-break pricing, date-bounded promotions, and category-based/percentage discounts (master spec §23) — today a price list only sets an absolute price per product, not a discount rule.

## Sales/Purchase integration

Neither `TaxService` nor `PricingService` is currently called from `SalesService`/`PurchasingService` — order lines still take an explicit `unitPrice`/`unitCost` from the caller. Wiring them in (so creating a sales order line resolves its price automatically, and dispatch computes tax) is a follow-up once a real UI exists to show/override the resolved values before an order is placed, rather than silently overriding what a salesperson typed.
