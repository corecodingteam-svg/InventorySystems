# Architecture Overview

## Stack Decisions

| Concern | Choice | Reason |
|---|---|---|
| Backend framework | NestJS (TypeScript) | Modular DI architecture maps 1:1 onto the module list (auth, organizations, products, inventory, ...); first-class guards/interceptors for tenant isolation & RBAC; built-in Swagger. |
| Database access | Raw SQL via [Kysely](https://kysely.dev) (type-safe query builder) + `pg` driver | Ledger/stock mutations need explicit `SELECT ... FOR UPDATE` row locking and hand-tuned transactions; an ORM would obscure this. Kysely gives compile-time-checked SQL without hiding the query. |
| Migrations | `node-pg-migrate` | Plain SQL/JS migrations, no ORM lock-in, works with any future access layer. |
| Cache/queues | Redis (ioredis) + BullMQ | Background jobs (notifications, webhooks, forecasting) and caching. |
| Frontend | Flutter (Windows, Web, Android, iOS, iPad) | Single codebase, responsive breakpoints. |
| State management | Riverpod | Compile-safe DI, testable, no BuildContext coupling, single consistent approach app-wide. |
| Local/offline DB | Drift (SQLite) | Typed local schema + sync queue table for offline mobile. |
| Reverse proxy (prod) | Nginx | TLS termination, static Flutter web hosting, API proxy. |

## System Diagram

```mermaid
flowchart TD
    subgraph Clients
        Web[Flutter Web]
        Desktop[Flutter Windows]
        Mobile[Flutter Android/iOS/iPad]
    end

    Web & Desktop & Mobile --> Nginx[Nginx Reverse Proxy]
    Nginx --> API[NestJS Backend API]
    API --> PG[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> Queue[BullMQ Workers]
    Queue --> PG
    Queue --> Notif[Notification Providers]
    API --> Storage[(File Storage: local -> S3/MinIO)]
```

## Backend Module Layering

```mermaid
flowchart LR
    Controller --> Service
    Service --> Domain[Domain / Business Rules]
    Domain --> Repository
    Repository --> DB[(PostgreSQL via Kysely)]
```

Controllers: HTTP concerns only (DTO validation, auth guard, response shaping).
Services: orchestrate use cases, transactions.
Domain: pure business rules (e.g. stock availability calculation).
Repository: Kysely queries, no business logic.

## Multi-Tenancy

Row-level tenant isolation: every tenant-owned table has `organization_id UUID NOT NULL REFERENCES organizations(id)`.
A NestJS `TenantGuard` + request-scoped `TenantContext` injects the authenticated user's `organization_id` into every repository call. Repositories require an explicit `organizationId` parameter — there is no "global" query method — so cross-tenant leakage requires an explicit code change, not an omission.

## Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Module
    participant DB as PostgreSQL
    C->>A: POST /auth/login (email, password)
    A->>DB: fetch user + verify bcrypt hash
    A->>C: access_token (15m JWT) + refresh_token (7d, httpOnly-equivalent, stored hashed in DB)
    C->>A: POST /auth/refresh
    A->>DB: validate refresh token hash, rotate
    A->>C: new access_token + refresh_token
```

## Phase Status

- [x] Phase 0: Repository audit (empty repo)
- [x] Phase 1: Architecture docs (this document + database.md, api.md, development-plan.md)
- [ ] Phase 2: Foundation (docker, db, backend auth/org/users/roles, flutter skeleton) — in progress
- [ ] Phase 3+: see development-plan.md
