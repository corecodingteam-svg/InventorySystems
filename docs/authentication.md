# Authentication

- Passwords hashed with bcrypt (cost 12).
- Access token: JWT, 15 minute expiry, signed with `JWT_SECRET`, carries `{ sub: userId, organizationId, email }`.
- Refresh token: random 48-byte token, stored **hashed** (bcrypt) in `refresh_tokens`, 7-day expiry, single-use (rotated on every refresh — the old row is marked `revoked_at`).
- `POST /auth/register-organization` creates a new tenant + its first admin user (granted every current permission) in one transaction.
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- Login currently resolves the user by email only (not scoped to a chosen organization first) — acceptable since `email` is unique per-organization, not globally; if the same email exists in two organizations this needs an org-picker step, deferred until multi-org-per-email is an actual product requirement.
- Provider-based login (Google/Microsoft/Apple) is not implemented; `AuthModule` is structured so an additional Passport strategy can be added without touching `JwtStrategy` or guards.
