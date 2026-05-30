# ADR 0001: Production-Grade Multi-Tenant SaaS Architecture

## Context and Problem Statement
SaaS boilerplate applications require a rock-solid security boundary between customers (tenants). In traditional applications, developer errors in SQL queries or ORM models frequently lead to cross-tenant data leakage (the most critical SaaS vulnerability). The goal is to build a boilerplate with zero risk of context leaks, high database performance, robust token security, and Stripe billing consistency.

## Decision Drivers
* **Security First**: Absolute data isolation must be enforced without relying solely on developer memory.
* **Database Performance**: Direct connection pooling should be maintained without dedicating separate connections per request.
* **Onboarding Simplicity**: Local development should not require live Cloud subscriptions (like AWS/Stripe) to run.
* **Token Hardening**: JWTs must implement strict reuse detection to prevent replay attacks.

## Architectural Decisions

### 1. Hybrid Multi-Tenancy Isolation
We implement a hybrid model combining **application-level filters** with **PostgreSQL Row-Level Security (RLS)** as defense-in-depth:
- **Application Level**: A custom `TenantAwareRepository` extends TypeORM's base repository. It automatically inspects if the queried entity has a `tenantId` field and appends `where: { tenantId }` to every query, resolving the active tenant ID from request-scoped context.
- **Database Level (RLS)**: Row-Level Security is active on the `tenants`, `memberships`, and other business tables. PostgreSQL policies verify table accesses against `current_tenant_id()` and `current_user_id()` session settings (`SET LOCAL app.current_tenant`). In production, the application connects as a non-superuser role `cortex_app` to enforce RLS.

### 2. Request-Scoped Context via `AsyncLocalStorage`
Instead of passing `tenantId` parameters down through NestJS services, we use Node.js's native `AsyncLocalStorage`.
- **TenantMiddleware**: Resolves the active tenant by inspecting the incoming request's `host` header (checking for custom domains first, falling back to subdomain slugs), and boots the storage context.
- **JwtStrategy**: Authenticates the bearer token, verifies the user, and binds the authenticated `userId` to the request's active context.

### 3. JWT Rotation with Reuse Detection
To secure API sessions:
- Access tokens expire in 15 minutes.
- Refresh tokens are long-lived (7 days) and stored in the database as SHA-256 hashes.
- On token refresh, the old refresh token is marked as `isUsed = true`, and a new access/refresh pair is returned.
- If a client attempts to refresh using a token where `isUsed = true`, the system assumes a session leak (token theft/replay) and immediately revokes all active sessions for that user.

### 4. Stripe Webhook Sync Consistency
Billing tiers and subscription states are synced to the `tenants` table.
- Stripe Webhook endpoint is public and uses Express raw body parsing to check the `stripe-signature` header against our signing secret.
- If the Stripe keys are not set, the service falls back to **Mock Sandbox Mode**, automatically upgrading the tenant locally upon checkout trigger to make developer onboarding simple and instant.

## Consequences
* **Mitigated Leakage Risk**: If a developer forgets to add a `where: { tenantId }` query filter, the `TenantAwareRepository` automatically appends it. If they bypass the repository and run a raw query, PostgreSQL RLS blocks the query since the session context is not matching the target tenant.
* **High Performance**: Connection pool parameters are managed globally (no connection-per-request overhead).
* **Easy Dev Loop**: Running `docker compose up --build` sets up Postgres, Redis, and spins up local servers instantly without live Stripe credentials.
