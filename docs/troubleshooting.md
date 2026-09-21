# Troubleshooting

**`docker compose up` fails on `postgres` healthcheck** — port 5432 already in use on the host by a local Postgres install; either stop it or change the published port in `docker-compose.yml`.

**Backend can't reach Postgres (`ECONNREFUSED`)** — `DATABASE_URL` host must be the service name `postgres`, not `localhost`, when running inside Docker.

**`relation "organizations" does not exist`** — migrations haven't run: `docker compose exec backend npm run migrate:up`.

**401 on every request after login works once** — access token expired (15 min) and refresh failed; check `refresh_tokens` isn't already revoked, and that `JWT_SECRET` is identical across backend restarts (a changed secret invalidates all issued tokens).

**Flutter web can't reach the API (CORS)** — backend has `cors: true` in `main.ts`; if a custom domain is used in production, `dio` in `flutter_app/lib/core/api/api_client.dart` needs `API_BASE_URL` passed via `--dart-define=API_BASE_URL=...` at build time.

**`flutter create .` complains the directory isn't empty** — expected; it merges into the existing `lib/`/`pubspec.yaml` rather than overwriting them. If it still errors, run it in an empty temp dir and copy only the generated platform folders in.

**`flutter build windows` fails with `C1083: Cannot open include file: 'atlstr.h'`** — the "Desktop development with C++" workload is installed but missing the "C++ ATL for latest v143 build tools" component, which `flutter_secure_storage_windows` needs. See docs/windows-development.md "Windows desktop toolchain" for the exact `winget` command that adds it (note: if Build Tools are already installed, plain `winget install` is a no-op — you need `--force` to get it to apply a new `--override` to an existing installation).

**`dart run build_runner build` fails or generated files look stale** — delete `*.g.dart` files under `lib/` and `test/` and rerun with `--delete-conflicting-outputs`; this regenerates Drift, Freezed, and json_serializable code from the current source.

**`docker info` hangs forever / `wsl --install` fails with `HCS_E_HYPERV_NOT_INSTALLED`** — hardware virtualization is disabled in the machine's BIOS/UEFI firmware. This cannot be fixed from within Windows; it needs a reboot into firmware setup to enable Intel VT-x/AMD-V. If that's not an option, skip Docker entirely and run the backend against a native PostgreSQL install instead — see docs/windows-development.md "No Docker? Native PostgreSQL", which is the exact path used (and verified working, including the full integration test suite) in an environment with this exact blocker.
