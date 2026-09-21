# Inventory Platform — Phase 2: Foundation

> Paste this page's content into Confluence. Written for: engineers and stakeholders tracking platform progress, not as an internal dev note.

## Summary

The foundation layer of the Inventory Platform is implemented and verified: Docker-based local environment, multi-tenant PostgreSQL schema, authentication, organizations, users, and role-based permissions, plus a responsive Flutter client shell with a working login flow. This is the base every later module (inventory, purchasing, sales, reporting, etc.) will build on.

## What was built

**Backend** — NestJS (TypeScript) API, using Kysely (type-safe SQL, not an ORM) over PostgreSQL so inventory transactions can use explicit row locking later without fighting an ORM.
- `auth` — organization registration, login, JWT access tokens (15 min) + rotating refresh tokens (7 day, hashed at rest)
- `organizations` — tenant record, get/update current organization
- `users` — per-organization user CRUD with server-side pagination, search, sorting
- `roles` / `permissions` — RBAC: a global permission catalog, per-organization roles, permission assignment
- `health` / `ready` endpoints for container orchestration
- Standardized list response (`data` + `pagination`) and error response (`success: false, error: {code, message}`) used across every endpoint
- Swagger/OpenAPI docs generated at runtime

**Database** — PostgreSQL via `node-pg-migrate`. Tables: `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `audit_logs`. All tenant tables carry `organization_id`; every query in the codebase filters by it explicitly (no "global" query path exists to accidentally leak across tenants).

**Frontend** — Flutter client skeleton (Windows, Web, Android, iOS, iPad from one codebase).
- Riverpod for state management (chosen once, used consistently)
- Adaptive shell: bottom nav on mobile, navigation rail on tablet, sidebar on desktop/web
- Centralized API client (Dio) with automatic token refresh
- Working login screen and dashboard placeholder
- Centralized semantic status-color system (success/warning/error/info/neutral) ready for the stock-status, order-status, etc. badges later phases will add

**Environment** — `docker-compose.yml` (dev: Postgres + Redis + backend with hot reload) and `docker-compose.prod.yml` (adds Nginx reverse proxy + Flutter web container, no ports exposed on Postgres/Redis). `.env.example` documents every required secret.

## Verified working

- Backend installs cleanly (`npm install`) and compiles with zero TypeScript errors (`nest build`)
- Unit tests pass (`AuthService` login rejection paths)
- `docker compose config` validates the full compose file against a real `.env`
- Database migrations define the complete foundation schema with FKs, unique constraints, and indexes (including a trigram index for name search)

## Not yet built (upcoming phases)

Products, warehouses, stock ledger, batches/serials, purchasing, sales, reporting, custom fields, workflows, POS, offline sync, AI assistant. See `docs/development-plan.md` for the full phase breakdown — each subsequent phase will get its own summary page like this one once complete.

## Where to find things

| Area | Path |
|---|---|
| Architecture & diagrams | `docs/architecture.md` |
| Database schema | `docs/database.md` |
| API reference | `docs/api.md`, live Swagger at `/api/docs` |
| Auth/RBAC details | `docs/authentication.md`, `docs/authorization.md` |
| Local setup | `docs/windows-development.md`, `docs/docker.md` |
| Production deploy | `docs/vps-deployment.md` |
