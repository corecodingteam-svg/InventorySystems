# Subscription / Plan Architecture (Phase 9)

Record-keeping only: `subscriptions` (one row per organization — `plan`, `status`, `seats`, `current_period_end`). `GET/PATCH /subscription` reads/updates the current organization's plan. `SubscriptionsService.getCurrent()` lazily creates a `FREE` subscription for an organization that doesn't have one yet, so no backfill migration was needed when this table was added.

No payment gateway is integrated (no credentials exist in this environment, and it's out of scope for the primary self-hosted/VPS deployment target — see docs/vps-deployment.md). Nothing in the codebase currently **enforces** a plan limit (seat count, feature gating by tier) — this table is the foundation a future check would read (e.g. "reject creating a 6th user on a 5-seat plan"), not an active gate today.
