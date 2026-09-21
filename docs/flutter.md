# Flutter Architecture

## First-time setup

Platform folders (`android/`, `windows/`, `web/`, `ios/`) are already generated and committed. `ios/` was generated with `flutter create . --platforms ios` but has never been **built** — there is no Mac in this environment, and `flutter build ios`/`ipa` requires Xcode on macOS. Treat the iOS project as scaffolded-but-unverified: open it in Xcode on a Mac, resolve CocoaPods (`cd ios && pod install`), and build there before trusting it compiles. `macos/`/`linux/` folders don't exist — run `flutter create . --platforms macos,linux` if those targets are ever needed. After cloning:

```bash
cd flutter_app
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # regenerates *.g.dart (Drift, Freezed, json_serializable)
```

`flutter analyze`, `flutter test`, and `flutter build web --release` all pass as of Phase 8 — verified in this environment, not just documented (see docs/testing.md).

## Layers

```
Presentation (Widgets/Screens)
   -> State Management (Riverpod: StateNotifier / Provider)
   -> Domain (plain Dart models, business rules shared across features)
   -> Data (Repository)
   -> API Client (Dio, core/api/api_client.dart) / Local DB (Drift, Phase 8)
```

Widgets never call Dio directly — always through a repository, so tests can mock the repository.

## State Management: Riverpod

Chosen for compile-time provider safety, testability without `BuildContext`, and no reliance on `InheritedWidget` boilerplate. Used exclusively — do not introduce Provider/GetX/BLoC alongside it.

## Responsive Shell

`shared/widgets/app_shell.dart` picks layout by `AppBreakpoints` (`core/theme/app_theme.dart`):
- `< 600px`: bottom navigation + drawer (mobile)
- `600–1024px`: navigation rail (tablet/iPad)
- `>= 1024px`: navigation rail/sidebar, extended past 1600px (desktop/web)

## Design System

Components are added incrementally under `shared/widgets/` as features need them (`AppDataTable`, `AppFilterBar`, etc. per the global listing standard) rather than pre-built speculatively. Foundation phase ships the shell + form primitives only.

Two additional reusable list patterns exist for the admin panel:
- `SimpleListScreen<T>` — a lighter `AppDataTable` sibling for endpoints that return a plain (unpaginated) array.
- `GenericAdminListScreen` — for Settings-style entities that are just "a small list, creatable via a short form" (roles, units, categories, brands, tax categories, price lists, webhook subscriptions, integration connections, workflow rules) — avoids writing a bespoke model/repository/controller/screen for each one.
- `ProductPickerField` — a type-ahead `Autocomplete` over `GET /products?search=`, shared by every line-item entry screen (purchase orders, sales orders, POS).
- `SimpleFormField`/`showSimpleFormDialog` — a minimal reusable "create entity" dialog for name/code-shaped forms.

## Screen Coverage (Admin Panel)

Every backend module from Phases 3–9 has a corresponding screen, reachable from the sidebar/drawer nav (`shared/widgets/app_shell.dart`):

| Area | Screen(s) | Notes |
|---|---|---|
| Dashboard | `features/dashboard` | Live stats |
| Products | `features/products` | Full CRUD (create dialog picks base unit from `/units`) |
| Stock | `features/inventory/stock_screen.dart` | Read-only balance view with status coloring |
| Stock Ledger | `features/inventory/stock_ledger_screen.dart` | Read-only |
| Warehouses | `features/warehouses` | List + create + tap-to-edit (name/status) |
| Stock Counts | `features/stock_counts` | Create → start → submit counted quantities → approve (posts variance); line items resolve to product SKU/name |
| Suppliers / Customers | `features/suppliers`, `features/customers` | List + create + tap-to-edit |
| Purchase Orders | `features/purchasing` | Create with line items (`ProductPickerField`) → approve → receive outstanding → cancel; approve/receive/cancel hidden unless the user holds the matching permission (`currentUserPermissionsProvider`); line items show product SKU/name, not a raw ID |
| Sales Orders | `features/sales_orders` | Create with line items → confirm (reserve) → dispatch reserved → cancel; same permission-gated actions and resolved product names as Purchase Orders |
| POS | `features/pos` | Registers (create) → open session → ring a sale (cart + payment method) → close session with expected-cash reconciliation |
| Reports | `features/reports` | Hub linking to all 7 report endpoints, rendered generically (`RawRowsScreen`); each report screen has a "copy as CSV" action (clipboard, since the API's `?format=csv` needs an auth header a browser navigation can't send) |
| Settings | `features/settings`, `features/units_categories_brands` | Users, Roles (create only — no delete endpoint), Units/Categories/Brands (create + delete), Custom Fields (per entity type), Tax Categories (create + delete), Price Lists (create + delete), Workflow Rules (create + delete), Webhooks (create + delete), Integrations (create + delete), Subscription (plan switch) |
| Barcode Scanner | `features/scanner` | Reachable from the Products screen FAB on mobile |

What's intentionally **not** built: a dedicated edit dialog for every Settings entity (delete now exists broadly via `GenericAdminListScreen.deletePathOf`, but editing most of them still means delete-and-recreate), per-row action menus beyond what each detail screen exposes, and a bespoke chart/table per report (reports render generically as key/value cards). Permission-based hiding covers the highest-risk actions (PO/SO approve, receive, dispatch, cancel) — not yet extended to every create/edit button on every screen.

## iOS builds

iOS builds/releases require macOS + Xcode (or a macOS CI runner such as GitHub Actions `macos-latest` / Codemagic). This cannot be done from Windows — the codebase stays cross-platform, but iOS packaging is a documented external dependency.

## Offline & Barcode Scanning (Phase 8)

- **Barcode scanning** (`features/scanner/`) — `mobile_scanner` on Android/iOS only (gated by `_supportsCameraScanning`, checked at runtime via `defaultTargetPlatform`); Windows/Web/desktop get a plain text field instead, since a USB/Bluetooth barcode scanner types into a focused text field as keyboard input there — no scanning code is needed or possible to meaningfully add. Both paths call the same `GET /products/barcode/:code` endpoint.
- **Offline sync** (`core/offline/`) — `LocalDatabase` (Drift/SQLite) holds one `SyncQueueEntries` table: every offline-queued write gets a locally-generated `idempotencyKey`, sent as the `Idempotency-Key` header on replay (backend/src/common/idempotency.interceptor.ts) so a retried sync after a dropped connection can't double-apply. `SyncService.syncPending()` replays entries in creation order and stops the batch at the first real conflict (HTTP 409) rather than skipping past it or overwriting — see `test/sync_service_test.dart` for the behavior under test with a real in-memory Drift database and a faked HTTP adapter.
- Nothing currently **calls** `SyncService.enqueue()` from a real mutation screen — the queue, replay, and idempotency machinery are built and tested, but no mobile warehouse-operation screen (receiving, picking, cycle count entry) is wired to queue offline yet. That wiring is the next Phase 8 increment once those screens exist; today's screens (Products, Suppliers, Customers, Dashboard) are read paths that don't need it.
- `AppBreakpoints`/responsive rules already conditionally show the scan FAB only on mobile width (`ProductsScreen`), as the pattern for feature screens to follow.
