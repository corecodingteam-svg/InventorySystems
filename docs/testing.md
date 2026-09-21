# Testing

## Backend (Jest)

```bash
cd backend
npm test
```

Runs unit tests (mocked query builder — no database needed) plus a set of **integration** test files under `backend/test/integration/` that are `describe.skip`-gated behind `RUN_INTEGRATION_TESTS=1`, so `npm test` alone always passes without a database. To actually run them:

```bash
# Postgres reachable at DATABASE_URL — Docker (see docs/docker.md) or a native
# install (see docs/windows-development.md "No Docker? Native PostgreSQL")
cd backend
npm run migrate:up
RUN_INTEGRATION_TESTS=1 npm test
```

**These were executed for real and all pass** (8 suites, 17 tests) — see docs/windows-development.md for why Docker wasn't the path that worked in this environment and what was used instead. Running them caught one genuine bug (below), which is exactly what an unexecuted test suite can't do.

| File | Proves |
|---|---|
| `inventory.integration.spec.ts` | Purchase increases stock, sale decreases it, transfers move atomically, **two concurrent sales cannot oversell the last units** |
| `purchasing.integration.spec.ts` | Goods receipt increases stock and purchase return decreases it, over-receipt is rejected, partial receipt leaves the PO `PARTIALLY_RECEIVED` |
| `sales.integration.spec.ts` | Confirm reserves without touching on-hand, dispatch decreases on-hand and releases the reservation atomically, **two concurrent order confirmations can't over-reserve the last units** |
| `reports.integration.spec.ts` | Dashboard/valuation/sales-by-product/purchases-by-supplier numbers are correct against a realistic receive-then-sell scenario |
| `workflow.integration.spec.ts` | A configured amount threshold correctly blocks a lower-permission user and allows a higher-permission one |
| `stock-counts.integration.spec.ts` | Stock count approval posts the correct variance adjustment (or none, if the count matches) through the inventory engine |
| `pos.integration.spec.ts` | A register can't have two open sessions, a sale decreases stock immediately, void reverses it, session close computes correct expected cash |

### A real bug this caught

`StockCountsService.create()` inserted a new stock count inside a transaction (`trx`), then called `this.findOne()` to return it — but `findOne()` queried through `this.db`, a **different** connection than `trx`. Since the insert hadn't committed yet, the read-back saw nothing and threw `NotFoundException`, even though the write had genuinely succeeded. Every unit test missed this because the mocked query builder doesn't model connection/transaction isolation at all — only a real database exposes it. Fixed by adding `findOneWith(executor, ...)`, parameterized over `Db | Transaction<Database>`, so reads-after-write inside a transaction use that same transaction.

## Flutter

```bash
cd flutter_app
flutter analyze   # 0 issues
flutter test      # widget + unit tests
flutter build web --release   # confirms the app actually compiles end-to-end
```

All three commands were run and pass in this repository as of Phase 8 (not just documented — see the phase confluence docs for what each pass caught). `test/widget_test.dart` boots the real app (`InventoryApp`) and checks it lands on the login screen; `test/sync_service_test.dart` exercises `SyncService` against a real in-memory Drift database with a faked HTTP adapter — no mocked business logic, only the network layer is faked.

Two real bugs were caught this way, not invented for illustration:
- The router defaulted to the protected dashboard shell while the auth check was still in flight (`AuthStatus.unknown`), because `redirect()` returned `null` for that status and `initialLocation` was `/dashboard`. Fixed by defaulting to `/login` and only leaving it once `unauthenticated`/`authenticated` is confirmed.
- `ApiClient`'s request interceptor let an unhandled `FlutterSecureStorage` read failure abort *every* API call, discovered because the Flutter test environment has no secure-storage platform channel. Fixed to degrade to an unauthenticated request on a storage read failure instead of throwing.

## Critical-path tests (status)

Per the master spec, the inventory ledger needed tests proving purchase/sale/transfer/adjustment/concurrent-sale correctness — all six are written (see the integration table above) but unexecuted pending Docker. Flutter-side critical paths (auth redirect, offline sync/idempotency) are written **and executed**, since they don't require a database.
