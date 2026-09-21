# Point of Sale (Phase 9)

POS is a separate, lighter-weight sale path from the Sales Order flow (Phase 5) — it's meant for a cashier ringing up an in-person sale, not a B2B order that goes through quotation/reservation/dispatch. It reuses the same underlying `InventoryService`, so stock moved through POS is exactly as ledgered and auditable as stock moved through any other module.

## Registers and Sessions

A `pos_register` belongs to one warehouse. Opening a session (`POST /pos/sessions/open`) records the starting cash float; a register can only have **one open session at a time** — enforced in `PosService`, not a database constraint (a partial unique index would work too, but the check-then-insert in application code was simpler to keep portable across the migration tooling used here). Closing a session (`POST /pos/sessions/:id/close`) sums every `CASH` payment recorded against sales in that session and reports `expected_cash = opening_cash + cash_payments`, next to whatever `closing_cash` the cashier counted — the discrepancy (if any) is left for the caller to interpret, not auto-reconciled.

## Sales

`POST /pos/sessions/:id/sales`:
1. Validates the session is `OPEN`.
2. Validates the supplied payments (cash/card/UPI/other, split across multiple methods) sum to the computed total (subtotal − discount + tax), rejecting with `409 PAYMENT_MISMATCH` otherwise.
3. Posts one `SALES_ISSUE` movement per line through `InventoryService` — stock leaves **immediately**, unlike a Sales Order which reserves first and dispatches later. This matches how a real point of sale behaves: there's no separate fulfillment step.
4. Supports `Idempotency-Key` (docs/mobile-offline.md) since a POS terminal is exactly the kind of device that might retry a sale after a network blip.

## Void

`POST /pos/sales/:id/void` reverses the sale's stock movement with a `RETURN_IN` per line and marks the sale `VOIDED` — it never deletes or edits the original `pos_sale`/`pos_sale_items`/ledger rows, consistent with the platform-wide rule that history is never rewritten, only corrected with a new movement.

## Not yet implemented

Receipt printing/cash drawer hardware integration, barcode-driven line entry in a dedicated POS UI (the Flutter barcode scanner from Phase 8 is reusable here but not yet wired into a POS screen), split-tender editing after the fact, and exchanges (today a return is a separate `sales_return` or a POS void, not a combined "return this, take that" flow).
