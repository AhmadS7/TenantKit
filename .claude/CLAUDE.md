# TenantKit — Claude Code Guide

> Multi-tenant SaaS boilerplate. NestJS 11 + Next.js 16 + Postgres RLS + Stripe + Redis + BullMQ.
> Built by Ahmad Shah. See `README.md` for the public overview and `docs/adr/0001-multi-tenant-architecture.md` for the architecture decision record.

---

## At a glance

| Layer | Path | Notes |
|---|---|---|
| Backend (NestJS) | `src/` | `pnpm` from repo root |
| Frontend (Next.js 16) | `frontend/` | `pnpm` from `frontend/` |
| Infrastructure | `infrastructure/terraform/` | AWS ECS Fargate + RDS + ElastiCache + ALB |
| CI | `.github/workflows/` | lint → test → e2e → build, no deploy stage |
| Docker | `docker-compose.yml` | local Postgres + Redis + backend + frontend |

---

## Build / test / lint commands

```bash
# Backend (run from repo root)
pnpm install
pnpm run lint          # eslint --fix across src/, apps/, libs/, test/
pnpm test              # jest unit tests (rootDir: src)
pnpm run test:cov      # coverage
pnpm run test:e2e      # e2e suite (requires Postgres) — resets DB via test-db-setup.js
pnpm run build         # nest build → dist/
pnpm run start:dev     # nest start --watch

# Frontend (run from frontend/)
cd frontend
pnpm install
pnpm run lint
pnpm test
pnpm run build
pnpm run dev

# Stack
docker compose up --build        # full stack
docker compose down -v           # nuke volumes (ask first)
```

> E2E resets the test DB via `test-db-setup.js`. Do **not** point it at your dev DB.

---

## Architecture must-knows

### Multi-tenancy (the whole point)
- **Shared table** with **Row-Level Security (RLS)**. One Postgres, one schema, one `tenantId` column on every tenant-scoped table.
- Tenant context lives in `AsyncLocalStorage` (`src/tenancy/tenant-context.ts`) — per request, set by `TenantMiddleware`, switched to the `tenantkit_app` role by `RlsInterceptor` via `SET LOCAL ROLE` + `set_config('app.current_tenant', $1)`.
- `TenantMiddleware` is **excluded** from: auth routes (`auth/register|login|refresh|logout|request-password-reset|reset-password|change-password`), `billing/webhook`, `health`. See `src/app.module.ts:107-128` for the full exclude list. Do not add new routes there without an ADR.
- `RlsInterceptor` wraps every non-excluded request in a transaction and applies the role switch. It is the **only** sanctioned path to the DB for tenant data.

### Auth (`src/auth/`)
- JWT access (15 min) + refresh (7 days, stored as SHA-256 hash).
- **Refresh-token rotation with reuse detection** — reusing a spent refresh token revokes **all** sessions for that user.
- Password reset uses a 1-hour signed JWT (single-use enforcement is in the roadmap, not yet implemented).
- Roles: `Owner`, `Admin`, `Member`, `Viewer`. Enforced by `RolesGuard` + `@Roles()` decorator.
- Soft delete on `User` only; `Tenant`, `Membership`, `RefreshToken` are hard-deleted.

### Billing (`src/billing/`)
- Stripe Checkout + signed webhook handler. Webhook reads the **raw body** for signature verification.
- Plan tiers: `Free` (default), `Pro`, `Enterprise`. `Starter` is in the roadmap, not wired.
- Mock sandbox mode: leave `STRIPE_API_KEY=change_me` to skip Stripe entirely.
- Webhook handler is one of the few routes that **bypasses** `TenantMiddleware` and `RlsInterceptor` — see `src/app.module.ts:122-123`.
- Webhook **does not** yet dedupe by `event.id` (roadmap).
- `FeatureGuard` + `@RequireFeature()` decorator gate routes on plan tier. Configured in `src/billing/features.config.ts`.

### Frontend (`frontend/`)
- Next.js 16 App Router, **client-rendered** (`'use client'`) components throughout — no Server Actions, no SSR of dynamic content.
- Tenant propagation via `next.config.ts` rewrite (`/_tenants/[tenant]`), then axios interceptor adds `X-Tenant` header.
- Axios interceptor handles **automatic 401 → refresh → retry** with a queued-request pattern.
- State: Zustand for auth, TanStack Query for server data.
- Tailwind CSS 4. No inline styles outside Tailwind utility classes.

### Other modules
- `src/common/interceptors/rls.interceptor.ts` — RLS role switcher (per-request transaction).
- `src/common/decorators/` — `@Public()`, `@Roles()`, `@RequireFeature()`.
- `src/redis/` — ioredis client. Used by throttler, cache, and BullMQ.
- `src/queue/` — BullMQ queues + workers. Used for background email, webhook retries.
- `src/mail/` — Nodemailer wrapper; pulls SMTP from env.
- `src/health/` — `@nestjs/terminus` indicators for app, db, redis, stripe.
- `src/migrations/` — TypeORM migrations. **Pair pattern**: every table migration has a `.ts` + sibling `.sql` file (e.g. `1735774200000-enable-rls.ts` + `1735774200000-enable-rls.sql`).

### Configuration
- `src/config/env.validation.ts` — Joi schema. `validationOptions: { allowUnknown: true, abortEarly: false }`.
- `ConfigModule` is `isGlobal: true`.
- `TypeOrmModule.forRootAsync` injects `ConfigService` and uses `getOrThrow` for every env var (not raw `process.env`).

### Database
- `synchronize: true` only in `NODE_ENV=development`. Production runs migrations on boot.
- The `tenantkit_app` role is required for RLS to take effect. Provision it via `1735774200000-enable-rls.sql`; in production point `DB_USERNAME` at it so `SET LOCAL ROLE` works.
- `extra: { max: 20, idleTimeoutMillis: 30000 }` — connection pool is small, do not leak connections.

---

## File-naming conventions

| File | Lives in | Purpose |
|---|---|---|
| `*.entity.ts` | module dir | TypeORM entity (or `entities/` subdir for large modules) |
| `*.controller.ts` | module dir | HTTP layer |
| `*.service.ts` | module dir | business logic |
| `*.module.ts` | module dir | NestJS module definition |
| `*.middleware.ts` | module dir | NestJS middleware (function form preferred) |
| `*.guard.ts` | module dir | NestJS guard (return `boolean` from `canActivate`) |
| `*.interceptor.ts` | `common/interceptors/` | cross-cutting transform |
| `*.dto.ts` | module `dto/` | request/response shapes, all class-validator decorated |
| `*.strategy.ts` | `auth/` | Passport strategy |
| `*.entity.ts` + `<timestamp>-*.sql` pair | `migrations/` | TypeORM migration + RLS policy pair |

---

## Roadmap (scaffolded, partial, or planned — do NOT build on these without an ADR)

From `README.md` §Roadmap. Each one is a footgun if treated as production-ready:

- **Rate limiting** — `@nestjs/throttler` is a dependency and registered (`ThrottlerGuard` is bound in `app.module.ts:90-92`) but default limits are wide. Tighten per-route.
- **Webhook idempotency** — Stripe webhook handler does not dedupe by `event.id`.
- **Billing grace period** — `past_due` is stored as-is from Stripe.
- **Single-use password reset** — reset JWT is time-limited only.
- **Strict CORS** — origin callback currently allows all origins with credentials. **Tighten before any production deploy.**
- **Correlation-ID logging + field redaction** — interceptor logs method/URL/duration only.
- **ECS auto-scaling** — fixed `desired_count = 2`. Add `aws_appautoscaling_*` when load profile is known.
- **CloudWatch alarms** — log groups exist, metric alarms do not.
- **CD stage** — CI is lint+test+e2e+build only; deploy is manual.
- **Starter plan tier** — only Free/Pro/Enterprise are wired in checkout.
- **`TenantAwareRepository`** — exists but is **not wired in**. Either wire or remove.
- **Migrations use placeholder role password** — `1735774200000-enable-rls.sql` has `<role_password>` placeholder; provision via Secrets Manager.

---

## Do not

- Do **not** introduce schema-per-tenant. RLS shared-table is the design (see ADR-001).
- Do **not** set `synchronize: true` in production.
- Do **not** hardcode secrets. Use `ConfigService.getOrThrow`.
- Do **not** bypass `RlsInterceptor` outside of `billing/webhook` and the auth routes in the exclude list. New bypasses need an ADR.
- Do **not** edit generated migrations once committed — add a new migration instead.
- Do **not** put migrations under `synchronize: true` — they will not run.
- Do **not** add raw SQL in services; use the TypeORM repository or a migration.
- Do **not** store tokens in `localStorage` (frontend) — use httpOnly cookies or in-memory with refresh.
- Do **not** use Server Actions in the frontend — `'use client'` + REST only.
- Do **not** add inline event handlers that take untrusted HTML strings.
- Do **not** write to `.env`, `.env.*`, or `**/secrets/**` — the pre-tool-use hook will block you.

---

## Skills & agents

Custom skills (under `.claude/skills/`, auto-discovered):

| Skill | Trigger |
|---|---|
| `/rls-audit` | "audit RLS", "check tenant isolation", "review policy" |
| `/tenant-trace` | "trace tenant", "where does tenantId come from" |
| `/stripe-debug` | "replay stripe webhook", "test billing flow" |
| `/db-migrate` | "add migration", "schema change", "new entity" |
| `/env-check` | "check env", "missing env vars" |
| `/pr-review` | "review pr" |
| `/commit` | "commit", "/commit" |
| `/frontend-test` | "run frontend test", "jest frontend" |

Subagents (under `.claude/agents/`, read-only, scoped tools):

| Agent | Specialty |
|---|---|
| `rls-auditor` | Postgres RLS, multi-tenant safety |
| `nestjs-reviewer` | NestJS modules, guards, pipes, interceptors |
| `nextjs-reviewer` | Next.js 16 App Router, client components, TanStack Query |
| `stripe-billing-reviewer` | Stripe webhooks, idempotency, plan tiers, FeatureGuard |
| `migration-author` | TypeORM migration + RLS policy pair |

Hooks (under `.claude/hooks/`, run automatically):

- `pre-tool-use.sh` — block secret writes, warn on already-committed migration edits, require confirm for destructive SQL.
- `post-tool-use.sh` — auto `prettier --write` + `eslint --fix` on every `.ts`/`.tsx` edit.
- `user-prompt-submit.sh` — detect destructive intent (`drop`, `wipe`, `force push`) → inject confirmation reminder.
- `stop.sh` — if uncommitted changes at stop → reminder.

See `.claude/rules/` for path-scoped rules that auto-load on matching file edits.
