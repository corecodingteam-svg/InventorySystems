# Inventory Forecasting (Phase 9)

`GET /reports/inventory/reorder-forecast` implements the formula from the master spec almost verbatim:

```
Average Daily Usage  = total SALES_ISSUE quantity over the trailing window / window days
Safety Stock         = Average Daily Usage × safetyStockDays
Reorder Point        = (Average Daily Usage × leadTimeDays) + Safety Stock
Suggested Order Qty  = max(0, ceil(Reorder Point − On Hand))
```

`windowDays` (default 30), `leadTimeDays` (default 7), and `safetyStockDays` (default 3) are query parameters — there's no per-product lead time or safety-stock configuration yet (`products.reorder_point` is a separate, manually-set field, included in the response as `configuredReorderPoint` for comparison against the computed one). Usage is read directly from `stock_ledger` (`transaction_type = 'SALES_ISSUE'`), not from sales order data, so it reflects everything that actually left the warehouse — POS sales included, not just Sales Order dispatches.

**This endpoint only ever returns a suggestion.** Nothing in the codebase reads its output and places a purchase order automatically — the master spec is explicit that purchase recommendations must go through configurable approval, never auto-order, and no such approval flow exists for auto-generated POs. Turning a forecast row into an actual PO is a manual action a purchasing user takes today (the row gives you everything needed to fill in `POST /purchase-orders`).

## Not yet implemented

Seasonal demand adjustment, per-product lead time (currently one global parameter for the whole query), and multi-warehouse-aware forecasting (today `onHand` and usage are summed across all warehouses for a product, not computed per warehouse).
