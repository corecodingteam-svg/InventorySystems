# Reports & Dashboards (Phase 6)

Phase 6 is read-only: it adds no new tables and no new stock-mutating code paths — every number here is derived by querying `stock_balances`, `stock_ledger`, and the procurement/sales tables built in Phases 3–5. This is deliberate: reports must never be able to drift from the data they report on, and the only way to guarantee that is to never let them write.

## Dashboard (`GET /reports/dashboard`)

Seven top-level counters, computed in parallel:

| Field | Meaning |
|---|---|
| `totalProducts`, `totalWarehouses` | Simple counts |
| `inventoryValue` | `sum(on_hand * cost_price)` across all stock balances |
| `lowStockCount` | Products whose total on-hand (summed across warehouses) is at or below their `reorder_point` |
| `outOfStockCount` | Stock balance rows at exactly zero on-hand |
| `pendingPurchaseOrders` | POs in `DRAFT`/`PENDING_APPROVAL`/`APPROVED`/`PARTIALLY_RECEIVED` |
| `pendingSalesOrders` | SOs in `DRAFT`/`CONFIRMED`/`PARTIALLY_DISPATCHED` |

## Inventory Reports

- `GET /reports/inventory/low-stock` — the same low-stock logic as the dashboard counter, itemized per product
- `GET /reports/inventory/stock-valuation` — `on_hand * cost_price` per product/warehouse slot, sorted highest-value first, with pagination and a `totalValue` sum; filterable by `warehouseId`

## Sales & Purchase Reports

- `GET /reports/sales/by-product`, `GET /reports/sales/by-customer` — quantity and revenue, computed from **actual dispatches** (`sales_dispatch_items`), not from ordered quantities — a sales order that was never fulfilled contributes nothing here, which is the correct behavior for a revenue report
- `GET /reports/purchases/by-supplier` — spend computed from **actual goods receipts** (`goods_receipt_items`), same reasoning
- `GET /reports/warehouse/activity` — ledger movement totals (`quantity_in`/`quantity_out`) grouped by warehouse and transaction type

All four accept optional `dateFrom`/`dateTo` (ISO date strings).

## CSV Export

Every report endpoint accepts `?format=csv` and returns `text/csv` with a `Content-Disposition: attachment` header instead of JSON — see `backend/src/common/csv.ts`. No third-party CSV library; the row shapes here are flat, so a small serializer functions correctly and keeps `package.json` smaller (per the master spec's own CSV/Excel export requirement, without pulling in a library that would only matter once XLSX export is actually built).

## Not yet implemented

Excel/PDF export, saved/scheduled reports, role-specific dashboard variants (Executive/Warehouse/Purchasing per master spec §28 — the current dashboard is one shared view), dead-stock/slow-moving/fast-moving analysis, and demand forecasting (master spec §30 — deferred to a later phase alongside the AI assistant architecture).
