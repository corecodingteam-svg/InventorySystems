# Inventory Platform — Phase 6: Reporting & Dashboards

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

Phase 6 is the first phase that doesn't add any new way to change data — it's purely about surfacing what's already there. A live dashboard and a set of operational reports now sit on top of everything built in Phases 3–5, and because this phase adds zero new tables and zero new write paths, there is no way for a report to say something different from what the underlying ledger actually recorded.

## What was built

- **Dashboard** — one screen, seven live numbers: total products, total warehouses, current inventory value, how many products are low on stock, how many stock slots are completely empty, and how many purchase/sales orders are still open. Refreshable on demand.
- **Inventory Reports** — a low-stock list (products at or below their reorder point) and a stock valuation report (current value of everything on the shelf, by product and warehouse, with pagination and a running total)
- **Sales Reports** — revenue and quantity by product and by customer. Deliberately computed from what was **actually dispatched**, not what was ordered — an order that never shipped doesn't inflate the numbers.
- **Purchase Reports** — spend by supplier, computed the same way, from actual goods receipts
- **Warehouse Activity** — movement totals per warehouse and transaction type over a date range
- **CSV Export** — every single report endpoint above can return a downloadable CSV instead of JSON with one query parameter

## Verified working

- Backend compiles cleanly and all unit tests pass with the Phase 6 additions
- A new integration test suite (`backend/test/integration/reports.integration.spec.ts`) runs a realistic scenario — a purchase order received into stock, then partially sold — against a real PostgreSQL database and checks that the dashboard, valuation, sales-by-product, and purchases-by-supplier numbers all come out correct
- **Not run in this session** — same caveat as every phase so far: Docker Desktop wasn't available in this working environment. Please run `docker compose up -d postgres && npm run migrate:up && RUN_INTEGRATION_TESTS=1 npm test` and confirm.

## Flutter

The Dashboard screen (previously a placeholder) now shows the seven live stat tiles above, using the same semantic color system as the rest of the app — low stock and out-of-stock counts turn amber/red automatically when they're non-zero, everything else stays neutral/informational.

## Not yet built (upcoming)

Excel/PDF export (CSV is done; XLSX would need a small library, deliberately not added until it's actually needed), role-specific dashboard variants (an Executive view vs. a Warehouse-staff view vs. a Purchasing view, per the original spec — today everyone sees the same dashboard), dead-stock/slow-moving/fast-moving analysis, and demand forecasting. Phase 7 (Configuration: custom fields, workflow engine, notifications, tax/pricing) is next.

## Where to find things

| Area | Path |
|---|---|
| What each report computes and why | `docs/reports.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
