# TenantKit

> **Multi-Tenant SaaS Boilerplate**
> Built by **Ahmad Shah** — a secure, scalable starting point so you don't rebuild auth, billing, and tenancy from scratch.

---

## 🎯 Who Is This For?

**TenantKit** is for developers and teams who are tired of:

- Rebuilding authentication, roles, and permissions for every new SaaS project
- Worrying about one tenant accidentally seeing another tenant's data
- Wrestling with Stripe webhooks, subscription states, and billing logic
- Spending weeks on DevOps before writing business logic
- Tutorial-grade boilerplates that break the moment you try to deploy them

If you are an **indie hacker**, **agency owner**, **startup CTO**, or **full-stack engineer** who needs a multi-tenant SaaS foundation you can actually read and extend, this is your starting line.

---

## 🚀 What TenantKit Gives You

| Concern | How TenantKit Handles It |
|---------|--------------------------|
| **Tenant Data Isolation** | PostgreSQL Row-Level Security (RLS) enforced per request via `SET LOCAL ROLE` + `set_config`, on top of `AsyncLocalStorage` request-scoped tenant context |
| **Auth** | JWT access/refresh tokens with rotation, refresh-token reuse detection, role-based access control (RBAC), and atomic user+tenant provisioning in one transaction |
| **Billing** | Stripe Checkout + signed webhook verification, plan tiers, and a mock sandbox mode so you can develop billing without Stripe keys |
| **Frontend/Backend Split** | Next.js 16 App Router client app, decoupled from the NestJS API over REST, with automatic tenant context propagation and JWT refresh handling |
| **Deployment** | Terraform AWS infrastructure (ECS Fargate, RDS, ElastiCache, ALB), multi-stage Docker builds, and Docker Compose for local development |
| **Security Baseline** | Helmet headers, input validation, sanitized error responses, and CloudWatch log aggregation |

> Some hardening features (rate limiting, webhook idempotency, billing grace periods, strict CORS) are scaffolded or planned — see [Roadmap](#-roadmap) for the honest status.

---

## 🏗 Architecture at a Glance

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│   Client    │────▶│  Next.js 16 │────▶│      NestJS API (ECS)       │
│  (Browser)  │     │  (Frontend) │     │  ┌─────────────────────┐    │
└─────────────┘     └─────────────┘     │  │ AsyncLocalStorage   │    │
                                        │  │ Tenant Context      │    │
                                        │  │ + per-request RLS   │    │
                                        │  └─────────────────────┘    │
                                        │           │                 │
                                        │           ▼                 │
                                        │  ┌─────────────────────┐    │
                                        │  │   PostgreSQL (RDS)    │    │
                                        │  │  Row-Level Security   │    │
                                        │  └─────────────────────┘    │
                                        │           │                 │
                                        │           ▼                 │
                                        │  ┌─────────────────────┐    │
                                        │  │   Redis (ElastiCache) │    │
                                        │  │  Caching              │    │
                                        │  └─────────────────────┘    │
                                        └─────────────────────────────┘
```

**Key Design Decisions:**
- **Decoupled SPA + API**: the Next.js frontend and NestJS backend are separate deploys that communicate only over the REST API — independently buildable, scalable, and replaceable.
- **Layered modular monolith backend**: feature modules (`auth`, `billing`, `tenancy`, `health`) in one NestJS process, one PostgreSQL database — not microservices.
- **RLS as defense-in-depth**: tenant context lives in `AsyncLocalStorage`; an interceptor opens a per-request transaction that sets `app.current_tenant` and switches to the non-superuser `tenantkit_app` role so RLS policies apply. Services also filter by `tenantId` explicitly. RLS shared-table design avoids schema-per-tenant operational complexity.

> See [ADR-001](./docs/adr/0001-multi-tenant-architecture.md) for the full rationale.

---

## ✨ Features

### Multi-Tenancy
- ✅ Subdomain routing (`tenant.yourapp.com`)
- ✅ Custom domain support (`client.com`)
- ✅ Automatic tenant resolution via middleware (host → tenant)
- ✅ Request-scoped tenant context via `AsyncLocalStorage`
- ✅ Per-request PostgreSQL RLS enforcement (`set_config` + `SET LOCAL ROLE tenantkit_app`)
- ✅ Atomic tenant provisioning (user + tenant + owner membership in one transaction)
- ⚠️ A `TenantAwareRepository` base class is included but **not currently wired in** — services use the RLS-scoped manager plus explicit `tenantId` filtering instead

### Authentication & Authorization
- ✅ JWT access tokens (15 min) + refresh tokens (7 days, stored as SHA-256 hashes)
- ✅ Refresh token rotation with reuse detection (reusing a spent token revokes all sessions)
- ✅ Role-based access control: Owner, Admin, Member, Viewer
- ✅ Password reset via signed, time-limited (1 h) JWT tokens
- ⚠️ Soft delete is on the **User** entity (and the tenant-scoped base entity) only — Tenant, Membership, and RefreshToken are hard-deleted

### Billing & Subscriptions
- ✅ Stripe Checkout integration
- ✅ Webhook handling with signature verification (raw-body + `stripe-signature`)
- ✅ Plan tiers: Free (default), Pro, Enterprise
- ✅ Mock sandbox mode (develop billing without Stripe keys)

### Frontend (Next.js 16)
- ✅ App Router, client-rendered (`'use client'`) components
- ✅ Tenant context propagation via middleware (subdomain → `/_tenants/[tenant]` rewrite)
- ✅ Automatic JWT refresh on 401 (axios interceptor with request queue)
- ✅ Zustand auth state + TanStack Query
- ✅ Responsive dashboard with billing settings (Tailwind CSS)
- ℹ️ Served as a standalone Node server (`output: 'standalone'`); no Server Actions and no static-site generation of dynamic content

### Infrastructure & DevOps
- ✅ Terraform AWS infrastructure (VPC, ECS Fargate, RDS, ElastiCache Redis, ALB)
- ✅ Docker multi-stage builds (frontend + backend)
- ✅ Docker Compose for local development
- ✅ GitHub Actions CI (lint → test → e2e → build) for both apps
- ✅ Health checks for app, database, Redis, and Stripe
- ✅ CloudWatch log groups for backend and frontend
- ℹ️ ECS runs a fixed `desired_count` of 2 tasks per service (no auto-scaling policy yet); CI has no deploy stage (deploy is manual via Terraform/Docker)

### Security
- ✅ Helmet security headers (HSTS, X-Frame-Options; CSP enabled in production)
- ✅ Input validation (global `ValidationPipe`: whitelist + forbidNonWhitelisted + transform)
- ✅ Sanitized error responses (structured JSON, no stack traces in production)
- ℹ️ CORS is currently permissive (the origin callback allows all origins with credentials) — tighten before production; see [Roadmap](#-roadmap)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, TypeScript, TypeORM |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Database** | PostgreSQL 16 with RLS |
| **Cache** | Redis (ioredis) |
| **Auth** | Passport, JWT, bcrypt |
| **Billing** | Stripe |
| **Infrastructure** | AWS (ECS Fargate, RDS, ElastiCache, ALB) |
| **IaC** | Terraform |
| **CI** | GitHub Actions |
| **Containers** | Docker, Docker Compose |
| **Package Manager** | pnpm |

---

## 📦 Quick Start

### Prerequisites
- Node.js 22+
- pnpm 10+ (`corepack enable`)
- Docker & Docker Compose
- Git

### 1. Clone & Install
```bash
git clone https://github.com/AhmadS7/TenantKit.git
cd TenantKit
pnpm install
cd frontend && pnpm install && cd ..
```

### 2. Environment Variables
Create a `.env` file in the repo root with at least:
```bash
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tenantkit

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET=change_me

# Stripe (optional — omit/leave as 'change_me' to run in mock sandbox mode)
STRIPE_API_KEY=change_me
STRIPE_WEBHOOK_SECRET=change_me
# STRIPE_PRO_PRICE_ID=price_...
# STRIPE_ENT_PRICE_ID=price_...

# RLS (off in development by default; set true to exercise RLS locally —
# requires the tenantkit_app role + policies from migrations)
# RLS_ENABLED=true
# DB_TENANT_ROLE=tenantkit_app
```

### 3. Start Everything (Docker Compose)
```bash
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Backend API on `http://localhost:3000`
- Frontend on `http://localhost:3001`

> Database migrations run **automatically on startup** when `NODE_ENV` is not `development` (`migrationsRun` in `app.module.ts`). In development the schema is created via TypeORM `synchronize`.

### 4. Access the App
- **Frontend**: http://localhost:3001
- **API Docs (Swagger)**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/v1/health

---

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests (requires a running PostgreSQL)
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

The e2e suite contains **21 test cases across 4 spec files** (auth, billing, dashboard, tenant middleware) covering authentication, tenant resolution, and billing. `test-db-setup.js` resets the e2e test database.

---

## 🚀 Production Deployment

### Terraform (AWS)
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

This provisions:
- VPC with public/private subnets
- ECS Fargate services (fixed 2 tasks each for frontend + backend)
- RDS PostgreSQL (private, encrypted)
- ElastiCache Redis (private)
- Application Load Balancer (path `/v1/*` and `/api/*` → backend, else frontend)
- CloudWatch log groups; secrets via AWS Secrets Manager

> **Before deploying:** provision the `tenantkit_app` PostgreSQL role with a real password (the RLS migration uses a placeholder), and point `DB_USERNAME` at it so per-request `SET LOCAL ROLE` works. With `NODE_ENV=production`, RLS is enforced by default.

---

## 📖 Documentation

- [Architecture Decision Records (ADRs)](./docs/adr/)
  - [ADR-001: Why RLS + AsyncLocalStorage over Schema Isolation](./docs/adr/0001-multi-tenant-architecture.md)
- [API Documentation](http://localhost:3000/api/docs) (Swagger UI, when running)

---

## 🗺 Roadmap

These are scaffolded, partially implemented, or planned — **not yet production-ready**:

- **Rate limiting** — `@nestjs/throttler` is a dependency but not wired (no `ThrottlerModule`/guard registered yet)
- **Webhook idempotency** — Stripe webhook handler does not yet deduplicate events by ID; duplicates are reprocessed
- **Billing grace period** — no `past_due` grace-period logic; subscription status is stored as-is from Stripe
- **Single-use password reset** — reset JWTs are time-limited (1 h) but not invalidated after first use
- **Strict CORS** — origin callback currently allows all origins; restrict to known hosts before production
- **Correlation-ID logging + field redaction** — the logging interceptor currently logs method/URL/duration only
- **ECS auto-scaling** — services run a fixed task count; add `aws_appautoscaling_*` policies
- **CloudWatch alarms** — log groups exist; metric alarms are not yet defined
- **CD stage** — GitHub Actions runs CI only; add a deploy job
- **Starter plan tier** — only Free/Pro/Enterprise are wired in checkout
- **Wire `TenantAwareRepository`** — or remove it in favor of the RLS-scoped manager

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or pull request describing your change.

---

## 📝 License

MIT — use it for personal projects, client work, or commercial products. Attribution appreciated but not required. *(A `LICENSE` file is not yet included in the repo.)*

---

## 👤 About the Author

**Ahmad Shah and Kazi Efazul Karim** built TenantKit to solve a recurring problem: every SaaS project starts with the same months of boilerplate for auth, billing, and tenancy.

> *"We built TenantKit because I was tired of rebuilding auth, billing, and tenancy for every client project."* — **Ahmad Shah**

---

## 🔗 Links

- **Repository**: https://github.com/AhmadS7/TenantKit
- **Issues & Roadmap**: https://github.com/AhmadS7/TenantKit/issues

---

<p align="center">
  <strong>Built with discipline. Shipped with confidence.</strong><br>
  <sub>© 2026 Ahmad Shah</sub>
</p>
