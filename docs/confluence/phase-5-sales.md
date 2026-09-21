# Inventory Platform — Phase 5: Sales

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

The sales side of the platform is implemented — the mirror image of Phase 4's procurement flow, but with one important addition: **stock reservation**. Confirming a sales order now holds stock for that order without actually removing it from the warehouse, so two salespeople can't both promise the same last units to two different customers.

## What was built

- **Customers** — code, contact details, a credit limit field (not yet enforced — see below)
- **Sales Orders** — multi-line, with a status lifecycle: `DRAFT → CONFIRMED → PARTIALLY_DISPATCHED → DISPATCHED`, or `CANCELLED`. Confirming and dispatching are gated behind their own permissions.
- **Stock Reservation** — confirming a sales order reserves stock for every line in one all-or-nothing transaction. Reservation uses the exact same database row-locking technique as the core inventory engine, so it's race-safe: two orders competing for the last units of stock can't both succeed.
- **Dispatch** — the actual fulfillment step: decreases on-hand stock and releases the matching reservation together, atomically, so those two numbers can never fall out of sync. Rejects attempts to dispatch more than was reserved. **Partial dispatch is supported** — an order can ship in multiple shipments over time.
- **Sales Returns** — puts stock back, optionally tied to a batch, fully ledgered like everything else

## Verified working

- Backend compiles cleanly and all unit tests pass with the Phase 5 additions
- A new integration test suite (`backend/test/integration/sales.integration.spec.ts`) proves against a real PostgreSQL database: confirming reserves stock without touching on-hand quantity, dispatch correctly decreases on-hand and clears the reservation, a sales return correctly restores stock, and — the key concurrency guarantee — two sales orders racing to confirm against the last 5 units of stock result in exactly one success and one rejection, never both succeeding
- **Not run in this session** — same as the previous two phases, Docker Desktop wasn't available in this working environment. Please run `docker compose up -d postgres && npm run migrate:up && RUN_INTEGRATION_TESTS=1 npm test` yourself and flag anything that fails before treating this as fully proven in your environment.

## Flutter

Added a Customers listing screen, reusing the same `AppDataTable` component from Phase 3/4 — the third screen built on it with zero new listing code, which is the return on investment that component was meant to produce.

## Not yet built (upcoming)

Quotations (the pre-order stage), customer-specific pricing, credit-limit enforcement (the column exists on `customers` but nothing checks it against order value yet), backorder tracking, and separate picking/packing stages (dispatch is currently the one fulfillment step — a deliberate simplification, not an oversight, documented in `docs/sales.md`). Phase 6 (Reporting/Dashboards) is next, and is the first phase that reads across everything built so far rather than adding new write paths.

## Where to find things

| Area | Path |
|---|---|
| SO lifecycle & reservation model | `docs/sales.md` |
| Reservation mechanics in the inventory engine | `docs/inventory-engine.md` ("Reservations") |
| Updated schema | `docs/database.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
