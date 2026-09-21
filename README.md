# Inventory Platform

Universal, multi-tenant, configuration-driven inventory management platform. See `docs/` for full architecture, database, API, and deployment documentation, and `docs/development-plan.md` for phase status.

**Status: Phases 2–9 implemented** (Foundation through POS/Forecasting/Webhooks/Integrations/Subscriptions), **except the AI assistant architecture (Phase 9), skipped by explicit request.** See `docs/development-plan.md` for exactly what each phase covers and what's still deferred within it.

**Admin panel coverage:** every backend module has a corresponding Flutter screen (products, stock, stock ledger, warehouses, stock counts, suppliers/customers, purchase orders, sales orders, POS, reports, and the full Settings area — see `docs/flutter.md` "Screen Coverage"), not just the handful of screens from earlier phases.

**Platform builds actually verified in this environment** (not just documented): `flutter build web --release`, `flutter build apk --debug` (produces a real installable APK), and `flutter build windows --release` (produces a real, launched-and-screenshotted `.exe`) all succeed. `flutter analyze` is clean and `flutter test` passes. See `docs/windows-development.md` for the exact Visual Studio components the Windows build needed (found by hitting the real compiler error, not guessed in advance).

**Backend actually run end-to-end against a real database, in this environment**: Docker Desktop couldn't run here (hardware virtualization disabled in firmware — see `docs/windows-development.md` "No Docker? Native PostgreSQL"), so PostgreSQL was installed natively instead. Migrations ran clean, the demo org seeded, the server started and served `/health`/`/ready`, and a real login returned a real JWT. With Postgres finally reachable, the **full integration test suite was run for the first time — 8/8 suites, 17/17 tests pass**, including every concurrency guarantee (no-oversell on concurrent sales, no-over-reserve on concurrent order confirmations, POS session locking). Running them caught one real bug (a transaction-isolation read-after-write issue in stock count creation), fixed and reverified — see `docs/testing.md` "A real bug this caught".

## Quick start (Windows + Docker)

```bash
cp .env.example .env.development   # fill in real secrets
docker compose up -d
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed
```

Backend: http://localhost:3000/api/v1 — Swagger: http://localhost:3000/api/docs
Seed login: `admin@demo.local` / `ChangeMe123!` (development only).

```bash
cd flutter_app
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # generates Drift/Freezed/json_serializable code
flutter run -d chrome    # or -d windows, or an Android device (iOS needs a Mac — see flutter.md)
```

Platform folders (`android/`, `windows/`, `web/`) are already committed; `flutter create .` only needs to be re-run if you add a platform this repo doesn't have yet (`ios`/`macos`/`linux`).

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Authentication](docs/authentication.md) / [Authorization](docs/authorization.md)
- [Inventory engine](docs/inventory-engine.md) / [Warehouse](docs/warehouse.md) / [Purchasing](docs/purchasing.md) / [Sales](docs/sales.md) / [Reports](docs/reports.md)
- [Configuration](docs/configuration.md) / [Workflows](docs/workflows.md) / [Notifications](docs/notifications.md)
- [Mobile & Offline](docs/mobile-offline.md)
- [POS](docs/pos.md) / [Forecasting](docs/forecasting.md) / [Integrations & Webhooks](docs/integrations.md) / [Subscriptions](docs/subscriptions.md)
- [Flutter](docs/flutter.md)
- [Docker](docs/docker.md) / [Windows dev setup](docs/windows-development.md) / [VPS deployment](docs/vps-deployment.md)
- [Testing](docs/testing.md) / [Troubleshooting](docs/troubleshooting.md)
- [Development plan](docs/development-plan.md)

## Repository layout

```
backend/        NestJS + TypeScript API (Kysely/pg, not an ORM — see architecture.md)
flutter_app/    Flutter client (Windows, Web, Android, iOS, iPad)
database/       node-pg-migrate migrations
nginx/          Production reverse proxy config
docs/           Architecture & operations documentation
```
