# API (Foundation Phase)

Base path: `/api/v1`. JSON. Auth via `Authorization: Bearer <access_token>`.

## Standard List Response

```json
{ "data": [], "pagination": { "page": 1, "pageSize": 25, "total": 0, "totalPages": 0 } }
```

Query params: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, plus entity-specific filters. `sortBy` is whitelisted server-side per endpoint.

## Standard Error Response

```json
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "Insufficient available stock." } }
```

## Endpoints (Phase 2)

```
POST   /api/v1/auth/register-organization   create org + first admin user
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/auth/me/permissions          granted permission codes for the current user (client-side UI hint only — see docs/authorization.md)

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/roles
POST   /api/v1/roles
PATCH  /api/v1/roles/:id
GET    /api/v1/permissions

GET    /api/v1/organizations/current
PATCH  /api/v1/organizations/current

GET    /health
GET    /ready
```

## Endpoints (Phase 3 — Inventory Core)

```
GET/POST         /api/v1/units
PATCH/DELETE      /api/v1/units/:id
GET/POST         /api/v1/units/conversions/all | /units/conversions

GET/POST/PATCH/DELETE  /api/v1/categories
GET/POST/PATCH/DELETE  /api/v1/brands

GET/POST         /api/v1/warehouses
GET/PATCH        /api/v1/warehouses/:id
GET/POST         /api/v1/warehouses/:id/locations

GET/POST         /api/v1/products
GET/PATCH/DELETE /api/v1/products/:id
GET/POST         /api/v1/products/:id/variants

GET/POST         /api/v1/batches                (list is FEFO-ordered by default: soonest expiry_date first)
GET/POST         /api/v1/serial-numbers
GET              /api/v1/serial-numbers/:id/history   (full ledger traceability for one serial)

GET              /api/v1/inventory/stock        (current on-hand per product/warehouse)
GET              /api/v1/inventory/ledger       (immutable movement history, filterable)
POST             /api/v1/inventory/opening-stock
POST             /api/v1/inventory/adjustments  (direction: IN | OUT)
POST             /api/v1/inventory/transfers    (atomic OUT + IN across warehouses)
```

`POST /inventory/adjustments` and `/transfers` return `409 INSUFFICIENT_STOCK` if the resulting balance would go negative and the product doesn't allow it — see docs/inventory-engine.md.

## Endpoints (Phase 4 — Procurement)

```
GET/POST         /api/v1/suppliers
GET/PATCH        /api/v1/suppliers/:id

GET/POST         /api/v1/purchase-orders
GET              /api/v1/purchase-orders/:id            (includes line items)
POST             /api/v1/purchase-orders/:id/submit      (DRAFT -> PENDING_APPROVAL)
POST             /api/v1/purchase-orders/:id/approve
POST             /api/v1/purchase-orders/:id/cancel
POST             /api/v1/purchase-orders/:id/goods-receipts   (partial receipt supported)

POST             /api/v1/purchase-returns
```

See docs/purchasing.md for the PO status lifecycle diagram.

## Endpoints (Phase 5 — Sales)

```
GET/POST         /api/v1/customers
GET/PATCH        /api/v1/customers/:id

GET/POST         /api/v1/sales-orders
GET              /api/v1/sales-orders/:id                (includes line items)
POST             /api/v1/sales-orders/:id/confirm         (DRAFT -> CONFIRMED, reserves stock)
POST             /api/v1/sales-orders/:id/cancel           (releases any undispatched reservation)
POST             /api/v1/sales-orders/:id/dispatches       (partial dispatch supported)

POST             /api/v1/sales-returns
```

See docs/sales.md for the SO status lifecycle diagram and the reservation model.

## Endpoints (Phase 6 — Reports)

```
GET  /api/v1/reports/dashboard
GET  /api/v1/reports/inventory/low-stock          (?format=csv)
GET  /api/v1/reports/inventory/stock-valuation    (?warehouseId=...&format=csv)
GET  /api/v1/reports/sales/by-product             (?dateFrom=...&dateTo=...&format=csv)
GET  /api/v1/reports/sales/by-customer            (?dateFrom=...&dateTo=...&format=csv)
GET  /api/v1/reports/purchases/by-supplier        (?dateFrom=...&dateTo=...&format=csv)
GET  /api/v1/reports/warehouse/activity           (?dateFrom=...&dateTo=...&format=csv)
```

See docs/reports.md.

## Endpoints (Phase 7 — Configuration)

```
GET/POST         /api/v1/custom-fields/definitions?entityType=...
PATCH/DELETE      /api/v1/custom-fields/definitions/:id
GET               /api/v1/custom-fields/values/:entityType/:entityId
POST              /api/v1/custom-fields/values/:entityType

GET/POST         /api/v1/tax/categories
PATCH/DELETE      /api/v1/tax/categories/:id
GET/POST         /api/v1/tax/rates?taxCategoryId=...
DELETE            /api/v1/tax/rates/:id

GET/POST         /api/v1/pricing/price-lists
PATCH/DELETE      /api/v1/pricing/price-lists/:id
GET/POST         /api/v1/pricing/price-lists/:id/items
DELETE            /api/v1/pricing/price-lists/:id/items/:productId
GET               /api/v1/pricing/resolve?productId=...&customerId=...&warehouseId=...

GET               /api/v1/notifications
POST              /api/v1/notifications/:id/read

GET/POST         /api/v1/workflow/purchase-approval-rules
DELETE            /api/v1/workflow/purchase-approval-rules/:id
```

See docs/configuration.md, docs/workflows.md, docs/notifications.md.

## Endpoints (Phase 8 — Mobile/Offline)

```
GET   /api/v1/products/barcode/:code

GET/POST  /api/v1/stock-counts
GET       /api/v1/stock-counts/:id
POST      /api/v1/stock-counts/:id/start
POST      /api/v1/stock-counts/:id/submit    (Idempotency-Key supported)
POST      /api/v1/stock-counts/:id/approve   (Idempotency-Key supported)
POST      /api/v1/stock-counts/:id/cancel
```

`POST /inventory/opening-stock`, `/adjustments`, and `/transfers` (Phase 3) also now accept an `Idempotency-Key` header. See docs/mobile-offline.md.

## Endpoints (Phase 9 — POS, Forecasting, Webhooks, Integrations, Subscriptions)

```
GET/POST         /api/v1/pos/registers
POST              /api/v1/pos/sessions/open
GET               /api/v1/pos/sessions/:id
POST              /api/v1/pos/sessions/:id/close
GET               /api/v1/pos/sessions/:id/sales
POST              /api/v1/pos/sessions/:id/sales   (Idempotency-Key supported)
GET               /api/v1/pos/sales/:id
POST              /api/v1/pos/sales/:id/void

GET               /api/v1/reports/inventory/reorder-forecast   (?windowDays=&leadTimeDays=&safetyStockDays=&format=csv)

GET/POST         /api/v1/webhooks/subscriptions
DELETE            /api/v1/webhooks/subscriptions/:id
GET               /api/v1/webhooks/subscriptions/:id/deliveries

GET/POST         /api/v1/integrations
DELETE            /api/v1/integrations/:id

GET/PATCH        /api/v1/subscription
```

See docs/pos.md, docs/forecasting.md, docs/integrations.md, docs/subscriptions.md.

Full OpenAPI spec is generated at runtime and served at `/api/docs` (Swagger UI) by `@nestjs/swagger`.
