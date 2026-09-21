# Inventory Platform — Phase 3: Inventory Core

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

The inventory engine — the most important subsystem in the whole platform per the original spec — is implemented, along with the product catalog and warehouse structure it depends on. Every stock movement in the system (purchase receipts, sales, transfers, adjustments, opening balances) now flows through one controlled, transactional, row-locked service, so concurrent operations against the same stock can't oversell or corrupt balances.

## What was built

- **Units** — configurable units of measure with conversion factors (e.g. 1 Box = 12 Pieces)
- **Categories** (with subcategories) and **Brands**
- **Warehouses & Locations** — multi-warehouse, with nested locations (Zone/Rack/Shelf/Bin, plus Receiving/Dispatch/Returns/Damaged/Quarantine area types)
- **Products** — SKU, barcode, pricing, product type (physical/service/digital/bundle/etc.), configurable reorder point, per-product negative-stock policy
- **Product Variants** — configurable attributes (e.g. color/size) stored flexibly, not hard-coded columns, so any industry's variant scheme fits
- **Batches** — batch/lot number, manufacture/expiry dates, listed FEFO (soonest-expiry-first) by default
- **Serial Numbers** — with full movement history per serial number for warranty/traceability use cases
- **The Inventory Engine** (`InventoryService`) — the controlled entry point for every stock change:
  - Append-only **stock ledger**: a permanent, immutable record of every movement
  - Derived **stock balance** cache for fast current-stock lookups, always reconcilable from the ledger
  - Opening stock, stock adjustments (in/out), and atomic warehouse-to-warehouse transfers
  - Row-level locking so two concurrent sales against the last units of stock cannot both succeed — one wins, one is correctly rejected with "insufficient stock"

## Verified working

- Backend compiles cleanly and all existing unit tests still pass after the Phase 3 additions
- A dedicated integration test suite (`backend/test/integration/inventory.integration.spec.ts`) proves against a **real** PostgreSQL database that: purchase receipts increase stock, sales decrease it, transfers move stock atomically between warehouses, and two concurrent sales against the last 5 units result in exactly one success and one rejection with stock never going negative
- **Not run in this session** — Docker Desktop wasn't available in the working environment, so this integration suite is written and ready but unexecuted here. Run it yourself with `docker compose up -d postgres`, `npm run migrate:up`, then `RUN_INTEGRATION_TESTS=1 npm test` in `backend/`, and let me know if anything fails.

## Flutter

Added the reusable listing framework the whole platform's screens will share going forward (`AppDataTable`): server-side search (debounced), sortable columns, pagination, a responsive desktop table vs. mobile card layout, and centralized empty/loading/error states. The Products screen is the first real screen built on it, reachable from the "Inventory" nav item.

## Not yet built (upcoming)

Stock counting/cycle counts, barcode scanning UI, unit-conversion-aware stock posting (receiving in Cartons vs. issuing in Pieces), and stock reservations (land with the Sales phase). Purchasing and Sales are next — they'll be the first modules to actually call into this inventory engine from real business documents (purchase orders, goods receipts, sales orders).

## Where to find things

| Area | Path |
|---|---|
| Inventory engine design & concurrency guarantee | `docs/inventory-engine.md` |
| Warehouse/location model | `docs/warehouse.md` |
| Updated schema | `docs/database.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
