# Inventory Engine

The single most important subsystem in the platform. All stock mutations go through `InventoryService.postMovement()` (`backend/src/inventory/inventory.service.ts`) — no other code path writes to `stock_balances` or `stock_ledger`.

## Model

- **`stock_ledger`** — append-only, authoritative history. Every row records `transaction_type`, `quantity_in`/`quantity_out`, `unit_cost`, and the resulting `balance_quantity` at that point in time. Never updated or deleted by the application.
- **`stock_balances`** — a derived cache: current `on_hand`/`reserved` per (product, variant, warehouse, location, batch) "slot", reconcilable at any time by replaying `stock_ledger`. This is what list/report screens query for speed; it is never the source of truth.

Nullable dimensions (`variant_id`, `location_id`, `batch_id`) are stored in `stock_balances` as a fixed nil UUID (`common/constants.ts: NIL_UUID`) rather than `NULL`, because Postgres unique constraints treat `NULL <> NULL` — real `NULL`s there would silently defeat the uniqueness the row-lock depends on. `stock_ledger` keeps them as real nullable FK columns since it never needs that uniqueness.

## Concurrency

`postMovement()`:
1. Looks up the product's `allow_negative_stock` flag.
2. `INSERT ... ON CONFLICT DO NOTHING` to guarantee the balance row exists.
3. `SELECT ... FOR UPDATE` to take a row lock on that exact slot.
4. Computes `newOnHand = onHand + quantityIn - quantityOut`; rejects with `409 INSUFFICIENT_STOCK` if negative and negative stock isn't allowed.
5. Updates the balance and inserts the ledger row, all inside one DB transaction.

Two concurrent calls against the same slot serialize on the Postgres row lock from step 3 — the second call blocks until the first transaction commits or rolls back, then reads the up-to-date `on_hand`. This is what prevents the "two users sell the last 5 units" overselling scenario from the master spec. See `backend/test/integration/inventory.integration.spec.ts` (requires a real Postgres — not run against the mocked unit-test suite).

## Transfers

`InventoryService.transfer()` posts a `TRANSFER_OUT` leg and a `TRANSFER_IN` leg inside one transaction via `postMovementInTrx()`, so a transfer can never leave stock decremented at the source without being incremented at the destination.

## Reservations (Phase 5)

`InventoryService.reserveInTrx()` / `releaseInTrx()` (used by Sales order confirm/dispatch/cancel — see docs/sales.md) adjust `stock_balances.reserved` using the same lock-or-create-then-`SELECT ... FOR UPDATE` pattern as `postMovement`, so two sales orders racing to reserve the last available units can't both succeed. Reservation deliberately does **not** move `on_hand` and does **not** write a `stock_ledger` row — the ledger's `quantity_in`/`quantity_out` columns model actual stock movement, and a reservation isn't one (nothing physically moved). `Available = on_hand - reserved` is computed at read time, matching the formula in the original spec.

## What's deferred

- The `STOCK_RESERVATION`/`STOCK_RELEASE` entries in the ledger transaction-type union are unused for the reason above; kept in the type for forward compatibility if a future audit requirement wants reservation events logged too.
- Stock counting/cycle counts, barcode scanning UI, and FEFO-driven batch picking are not yet implemented (Phase 3 shipped batches/expiry tracking and FEFO-ordered batch listing, not automated picking).
- Multi-unit transactions (e.g. receiving in Cartons and issuing in Pieces) — `unit_conversions` exists in the schema but `postMovement` currently expects quantities already in the product's base unit; conversion-aware posting is a follow-up.
