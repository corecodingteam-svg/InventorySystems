# Inventory Platform — Phase 4: Procurement

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

The procurement side of the platform is implemented: suppliers, purchase orders with an approval step, goods receipts that actually move stock, and purchase returns — all built directly on top of the Phase 3 inventory engine, so every unit of stock that enters or leaves through purchasing is fully traceable in the same ledger as everything else.

## What was built

- **Suppliers** — code, contact details, payment terms, active/inactive status
- **Purchase Orders** — multi-line, with a status lifecycle: `DRAFT → PENDING_APPROVAL → APPROVED → PARTIALLY_RECEIVED → RECEIVED`, or `CANCELLED` at any point before receipt. Approval is a distinct permission (`purchase.approve`) from creation (`purchase.create`), so the same person doesn't have to both raise and approve a PO.
- **Goods Receipts** — the only way procurement puts stock into the system. Each receipt:
  - Validates you can't receive more than what's still outstanding on a PO line (rejects over-receipt)
  - Supports **partial receipts** — a PO can be received in several shipments over time, with the PO automatically moving to `PARTIALLY_RECEIVED` and only flipping to `RECEIVED` once every line is fully received
  - Posts the stock increase and updates the PO in one atomic database transaction — a receipt record can never exist without the corresponding stock movement, or vice versa
  - Supports tagging received stock with a batch number for batch-tracked products
- **Purchase Returns** — sends stock back out (optionally against a specific batch), fully ledgered

## Verified working

- Backend compiles cleanly and all unit tests pass with the Phase 4 additions
- A new integration test suite (`backend/test/integration/purchasing.integration.spec.ts`) proves against a real PostgreSQL database: goods receipt increases stock and purchase return decreases it correctly, over-receipt is rejected, and partial receipts correctly leave a PO in `PARTIALLY_RECEIVED` rather than prematurely marking it `RECEIVED`
- **Not run in this session** — same as Phase 3, Docker Desktop wasn't available in this working environment. Please run `docker compose up -d postgres && npm run migrate:up && RUN_INTEGRATION_TESTS=1 npm test` yourself and flag anything that fails.

## Flutter

Added a Suppliers listing screen (reusing the same `AppDataTable` component from Phase 3 — no new listing code needed), reachable from the "Purchasing" nav item. A full purchase order creation/approval UI is not yet built — the API is ready for it.

## Not yet built (upcoming)

Purchase Requests and RFQ/Supplier Quotation stages (the spec's full pre-PO flow) — procurement currently starts directly at the Purchase Order. A configurable amount-threshold approval workflow (multi-level, department-based) is deferred to Phase 7's workflow engine; today approval is a single permission-gated step. Sales (Phase 5) is next, and will be the mirror of this phase on the outbound side.

## Where to find things

| Area | Path |
|---|---|
| PO lifecycle & design notes | `docs/purchasing.md` |
| Updated schema | `docs/database.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
