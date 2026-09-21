# Inventory Platform — Phase 7: Configuration

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

Phase 7 is what makes the platform genuinely configurable per organization instead of hard-coded: custom fields any entity can carry, a tax engine, a pricing engine, an in-app notification system, and — the centerpiece — a real configurable approval workflow, proven end-to-end with two different users holding two different permission levels.

## What was built

- **Custom Fields** — administrators define fields (text, number, currency, date, dropdown, multi-select, etc.) against any entity type without a code change or migration, and the platform validates values against those definitions (unknown fields rejected, required fields enforced) before saving. This is the mechanism that lets the same platform serve a pharmacy's "Drug Class / Strength" fields and a furniture retailer's "Material / Dimensions" fields without forking the codebase.
- **Tax Engine** — configurable tax categories and rates, deliberately generic rather than India-GST-specific, so it fits VAT/sales-tax models equally.
- **Pricing Engine** — price lists scoped to a specific customer, a specific warehouse, or general, with clear precedence rules (customer beats warehouse beats general beats the product's own list price) resolved by a single `resolvePrice()` call.
- **Notifications** — an in-app notification inbox, with two real triggers wired in: every purchase order approval, and an on-demand low-stock summary.
- **Workflow Engine** — configurable amount-threshold approval rules for purchase orders. An organization can say "POs over ₹100,000 need Finance approval, not just Manager approval," and the system enforces it as a *second*, dynamic permission check layered on top of the existing static `purchase.approve` gate.

## Verified working

- Backend compiles cleanly and all unit tests pass with the Phase 7 additions
- A new integration test suite (`backend/test/integration/workflow.integration.spec.ts`) runs the exact scenario above against a real PostgreSQL database: a Manager-level user can approve a low-value PO but is correctly rejected on a high-value one, and a Finance-level user (with the specific permission the threshold rule names) can approve it. This is the most concrete proof so far that permission checks in this system compose correctly rather than being all-or-nothing.
- **Not run in this session** — same caveat as every phase so far: Docker Desktop wasn't available here. Please run `docker compose up -d postgres && npm run migrate:up && RUN_INTEGRATION_TESTS=1 npm test` and confirm.

## Flutter

No new screens this phase — everything built here is administrative configuration (custom field definitions, tax rates, price lists, workflow rules), which belongs under a Settings section the Flutter app doesn't have screens for yet. The APIs are ready for it.

## Not yet built (upcoming)

Custom **forms** as a designed layout (today it's just an ordered list of field definitions), quantity-break/promotional pricing, composite taxes (e.g. a GST-style CGST+SGST split shown as two lines), multi-level/escalating approval chains, and a background job scheduler to trigger notifications automatically instead of via a manual endpoint call (Redis/BullMQ are named in the architecture but not implemented yet). Phase 8 (Mobile/Offline: barcode scanning, offline sync) is next.

## Where to find things

| Area | Path |
|---|---|
| Custom fields, tax, pricing | `docs/configuration.md` |
| Workflow engine design & diagram | `docs/workflows.md` |
| Notification triggers & what's stubbed | `docs/notifications.md` |
| Updated schema | `docs/database.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
