# Notification Engine (Phase 7)

## Channels

Only **in-app** is implemented — a `notifications` table, read via `GET /notifications` (a user sees their own notifications plus organization-wide broadcasts, where `user_id IS NULL`), marked read via `POST /notifications/:id/read`.

Email/SMS/WhatsApp/push (master spec §32) are **not wired to any provider**. This is deliberate, not an oversight: there are no provider credentials in this environment, and the master spec explicitly says not to fake external integrations. `NotificationsService.create()` is already the single choke point every trigger goes through, so adding a provider later means adding a dispatch step inside that one method (or a queued job reading from it), not touching every caller.

## What triggers a notification today

- `PurchasingService.approvePurchaseOrder()` — broadcasts "Purchase order approved" on every approval
- `ReportsService.notifyLowStock()`, called via `POST /reports/inventory/low-stock/notify` — broadcasts one consolidated notification summarizing everything currently at or below its reorder point (not one notification per product, to avoid flooding)

## Not yet implemented

- Automated/scheduled triggering — the low-stock check above is invoked manually via that endpoint; there's no background job scheduler wired yet (architecture.md names Redis/BullMQ for this, not yet implemented) to run it periodically or on every stock-ledger write
- Sales order / stock discrepancy / payment-due notification triggers (master spec lists these; only purchase-approval and low-stock exist today)
- Per-user notification preferences (which events/channels a user wants)
- Real email/SMS/WhatsApp/push delivery
