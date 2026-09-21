# Windows Development Setup

1. **Docker Desktop** (WSL2 backend) — runs Postgres/Redis/backend.
2. **Flutter SDK** — `flutter doctor` should be clean for the targets you build.
3. **Node.js 20+** — only needed on the host if you run the backend outside Docker; inside Docker it's bundled in the image.
4. Copy `.env.example` to `.env.development`, fill in values, then `docker compose up -d`.
5. `cd flutter_app && flutter pub get && dart run build_runner build --delete-conflicting-outputs`.
6. Run a target: `flutter run -d windows`, `-d chrome`, or `-d <android-device-id>`.

## Windows desktop toolchain (verified working)

`flutter build windows` needs Visual Studio 2022 Build Tools with two components — confirmed by actually hitting the missing-component build error and fixing it in this environment, not just documented from the general Flutter requirement:

- **Desktop development with C++** (`Microsoft.VisualStudio.Workload.VCTools`) — the compiler/linker itself.
- **C++ ATL for latest v143 build tools** (`Microsoft.VisualStudio.Component.VC.ATL`) — required specifically because `flutter_secure_storage_windows` (used by the app's token storage) includes `atlstr.h`. Without this component the build fails with `C1083: Cannot open include file: 'atlstr.h'` even though the base C++ workload is installed — this is not obvious from Flutter's own docs and was only found by running the actual build.

Unattended install (what was used here):

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --silent `
  --accept-package-agreements --accept-source-agreements `
  --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.ATL --includeRecommended"
```

If Build Tools are already installed and you only need to add the ATL component afterward, `winget install` on the same package ID is a no-op ("already installed") unless you pass `--force`, which re-invokes the installer with your override and actually adds the missing component:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --force `
  --accept-package-agreements --accept-source-agreements `
  --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Component.VC.ATL"
```

After installing, `flutter doctor -v` should show `[√] Visual Studio - develop Windows apps`, and `flutter build windows --release` should produce `build\windows\x64\runner\Release\<app>.exe`.

## No Docker? Native PostgreSQL (verified working)

Docker Desktop requires WSL2, which requires **hardware virtualization enabled in the machine's firmware (BIOS/UEFI)**. If it isn't — `docker info` hangs waiting on the engine, and `wsl --install` eventually fails with `HCS_E_HYPERV_NOT_INSTALLED` / "virtualization is not enabled on this machine" — there is no software-only fix; it requires rebooting into firmware setup and enabling Intel VT-x / AMD-V, which nobody can do remotely or non-interactively. This is exactly what happened in this environment, and rather than block on it, the backend was run against a **native PostgreSQL install** instead — nothing in this codebase actually requires Docker, it only needs Postgres reachable at `DATABASE_URL`. Redis is named in the architecture doc but nothing in the backend uses it yet (see docs/architecture.md), so its absence here doesn't block anything.

What was actually run, in order, and confirmed working end-to-end (server started, `/health` and `/ready` both green, real login returned a real JWT, and the full `RUN_INTEGRATION_TESTS=1` suite passed — 8/8 suites, 17/17 tests):

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --silent `
  --accept-package-agreements --accept-source-agreements
```

This installs and **starts the `postgresql-x64-16` Windows service automatically** — no separate step needed. The installer's default superuser is `postgres` with password `postgres` (the EDB installer's default when none is supplied via `--override`; change this before doing anything beyond local development). Then create the app's role and database:

```bash
psql -U postgres -h localhost -c "CREATE ROLE inventory LOGIN PASSWORD 'change_me';"
psql -U postgres -h localhost -c "CREATE DATABASE inventory OWNER inventory;"
psql -U postgres -h localhost -d inventory -c "GRANT ALL ON SCHEMA public TO inventory;"
```

Point `backend`'s environment at it (`DATABASE_URL=postgres://inventory:change_me@localhost:5432/inventory`) instead of the Docker Compose service name, then run migrations/seed/dev server exactly as documented elsewhere — `npm run migrate:up`, `npm run seed`, `npm run start:dev` — all work unmodified, since the backend only cares about `DATABASE_URL`, not how Postgres got there.

If your machine *does* have virtualization available (check `systeminfo` for "Hyper-V Requirements" or your BIOS's virtualization setting), Docker Compose remains the documented default path (docs/docker.md) — this native-Postgres route is specifically the fallback for when it isn't.

## iOS

Not buildable on Windows — see docs/flutter.md. Use a macOS machine or CI runner when an iOS build is needed.
