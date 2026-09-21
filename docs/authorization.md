# Authorization (RBAC)

`GET /auth/me/permissions` returns the current user's granted permission codes — added so the Flutter client can hide/disable actions the user can't perform (e.g. the Approve button on a purchase order) instead of only finding out via a 403 after tapping it. This is a UX convenience, not the authorization boundary — `PermissionsGuard` on the backend remains the actual enforcement point; the client-side check is best-effort and must never be trusted as the real gate.

`permissions` is a global code catalog (`product.view`, `inventory.adjust`, ...). `roles` are per-organization and link to permissions via `role_permissions`. Users get roles via `user_roles`.

`PermissionsGuard` (backend/src/auth/permissions.guard.ts) reads `@RequirePermissions('code', ...)` metadata from the route handler, loads the current user's granted permission codes, and requires all listed codes to be present — otherwise `403 PERMISSION_DENIED`.

Tenant isolation is separate from permission checks: every service method takes `organizationId` explicitly (from the JWT, via `@CurrentUser()`) and every query filters on it — there is no method that queries without an organization filter, so a missing permission check and a missing tenant filter are two independent, both-required bugs to introduce, not one.

Branch/warehouse/location-scoped role restriction (master spec §8) is deferred to Phase 3+ once warehouses exist.
