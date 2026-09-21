# Integration Architecture (Phase 9)

Per the master spec: "do not implement every integration immediately... build the abstraction correctly." This phase builds the abstraction — no real Shopify/WooCommerce/Amazon/Tally/Zoho Books/payment-gateway connector exists.

## What's built

- `integration_connections` — one row per configured connection: a `provider` key (free text, not an enum, so a new provider needs no migration), a `name`, and a `config` JSONB blob for whatever that provider needs (API keys, store URLs, mapping rules).
- `IntegrationsService` — CRUD only: create/list/delete a connection record. No sync logic, no scheduled job, no data flowing to or from any external system.

## How a real connector would be added later

Nothing here needs to change. A real integration would be a new class (e.g. `ShopifyConnector`) that:
1. Reads its `integration_connections.config` for a given connection.
2. Implements whatever sync operations that provider needs (pull orders, push inventory levels, etc.) using the existing domain services (`ProductsService`, `InventoryService`, `SalesService`, ...) — never bypassing them, so a Shopify order still creates a real `sales_order` and posts through the inventory engine like any other sale.
3. Runs on a schedule via a background worker once one exists (see docs/notifications.md — no Redis/BullMQ job runner is wired up yet either).

## Webhooks (outbound)

Implemented in Phase 9 as the platform's half of "integration" — the inbound half (accepting a webhook, an API key, or an OAuth callback *from* Shopify/etc.) is not built, only outbound notification to systems that want to know when something happens here.

`webhook_subscriptions` (a URL + a list of event types an org wants to hear about) and `webhook_deliveries` (one row per attempt, so failures are inspectable). `WebhooksService.dispatch(orgId, eventType, payload)` is called synchronously at the point of the triggering event — there is **no retry queue or backoff** (again, no background job runner exists yet), so a delivery either succeeds or is marked `FAILED` on the first attempt and stays that way until a real queue-backed retry worker is added. Every delivery is HMAC-signed (`X-Webhook-Signature`, SHA-256 over the raw JSON body using the subscription's per-org secret) so a receiver can verify authenticity.

Wired-in events today: `product.created`, `purchase.approved`, `sales.dispatched`, `inventory.low_stock` (fired manually via `POST /reports/inventory/low-stock/notify`, same as its in-app notification counterpart — see docs/notifications.md).

## Not yet implemented

Any real external connector, inbound webhook/OAuth handling, retry/backoff for outbound webhook delivery, and a UI for configuring integrations (API only).
