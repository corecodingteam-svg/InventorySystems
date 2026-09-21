# Inventory Platform — Phase 8: Mobile & Offline

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

Phase 8 gives the platform its mobile warehouse-floor capability: stock counting, barcode scanning, and the offline infrastructure a warehouse app needs when the WiFi drops mid-aisle. It's also the phase where the Flutter side of this project was, for the first time, actually compiled and run through its own test suite rather than just written — two real bugs turned up and got fixed as a direct result.

## What was built

- **Stock Counting** — the mobile warehouse workflow the spec always intended: create a count (snapshots current book stock), walk the warehouse and submit counted quantities, approve to post the variance as a stock adjustment. Every adjustment goes through the same inventory engine as everything else — a stock count can never quietly change a number without leaving a ledger trail.
- **Barcode Lookup** — one endpoint that resolves a scanned barcode to a product (checking the product's own barcode, then falling back to variant barcodes).
- **Idempotency** — critical write endpoints (stock adjustments, transfers, stock count submit/approve) now accept an `Idempotency-Key` header. If a mobile client's connection drops after it sent the request but before it got the response, retrying with the same key replays the original result instead of double-applying the change. This is the infrastructure the offline sync queue below depends on.
- **Flutter Offline Architecture** — a local SQLite-backed queue (Drift) that any future mobile screen can enqueue writes into while offline, plus a sync service that replays the queue in order once back online and stops cleanly at the first genuine conflict instead of guessing how to resolve it or silently skipping past it.
- **Barcode Scanning (Flutter)** — camera-based scanning on Android/iOS; on Windows/Web a plain text field is used instead, since a physical USB/Bluetooth scanner types into it directly there — no app code needed for that path.

## Verified working — for real, this time

Flutter was actually built and exercised in this session, not just written and assumed correct:

- `flutter create .` was run, generating and committing the Windows/Web/Android platform scaffolding (iOS needs a Mac, which wasn't available — documented, not silently skipped)
- `flutter analyze` — **0 issues**
- `flutter test` — all 3 tests pass, including a real unit test of the sync queue against an in-memory database with a faked (not mocked-away) HTTP layer
- `flutter build web --release` — the app actually compiles to a deployable web build

This caught two genuine bugs that had been sitting in the code since earlier phases:
1. **A navigation/security bug**: the app briefly showed the protected dashboard before the login check had finished, because the router's default route assumed authentication would resolve instantly. Fixed to default to the login screen until the check actually completes.
2. **A resilience bug**: if the secure-storage read for the auth token failed for any reason, every single API call would have failed with it — discovered because the test environment doesn't have a secure-storage platform channel, which is exactly the kind of "storage briefly unavailable" condition that could happen on a real device too. Fixed to degrade gracefully instead of taking down all networking.

Backend: clean build, unit tests pass. Two new real-Postgres integration suites (stock counting, and reused workflow/reports tests exercising the idempotency-adjacent paths) are written — **not executed this session**, same Docker Desktop caveat as every prior phase. Please run `docker compose up -d postgres && npm run migrate:up && RUN_INTEGRATION_TESTS=1 npm test` and confirm.

## Not yet built (upcoming)

No screen yet actually queues a write into the offline sync system — the queue/replay/idempotency machinery is built and tested, but the mobile receiving/picking/cycle-count-entry screens that would use it don't exist (today's Flutter screens are read-list views). No automatic sync-on-reconnect, no conflict-resolution UI for a failed sync entry. Phase 9 (POS, AI assistant architecture, forecasting, integrations) is the last phase in the original plan.

## Where to find things

| Area | Path |
|---|---|
| Stock counting, barcode, idempotency | `docs/mobile-offline.md` |
| Flutter offline/scanning architecture | `docs/flutter.md` |
| What was tested and what it caught | `docs/testing.md` |
| New endpoints | `docs/api.md` |
| Phase status | `docs/development-plan.md` |
