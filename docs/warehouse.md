# Warehouse Management (Phase 3)

`warehouses` (organization-scoped, unique `code`) contain `locations` (unique `code` per warehouse), each with a `location_type`: `ZONE`, `RACK`, `SHELF`, `BIN`, `RECEIVING`, `DISPATCH`, `RETURNS`, `DAMAGED`, `QUARANTINE`. Locations self-reference via `parent_id` for nesting (e.g. Zone -> Rack -> Shelf -> Bin).

API: `GET/POST /warehouses`, `PATCH /warehouses/:id`, `GET/POST /warehouses/:id/locations`.

Not yet implemented: location capacity limits, preferred-location assignment per product, and warehouse-level operational dashboards (receiving/dispatch queues) — these depend on the Purchasing and Sales phases that generate the receipts/dispatches to queue.
