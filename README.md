# Cortex

> **Production-Ready Multi-Tenant SaaS Boilerplate**  
> Built by **Ahmad Shah** — because every SaaS founder deserves a secure, scalable foundation without rebuilding auth, billing, and tenancy from scratch.

---

## 🎯 Who Is This For?

**Cortex** is engineered for developers and teams who are tired of:

- Rebuilding authentication, roles, and permissions for every new SaaS project
- Worrying about one tenant accidentally seeing another tenant's data
- Wrestling with Stripe webhooks, subscription states, and billing logic
- Spending weeks on DevOps before writing a single line of business logic
- Tutorial-grade boilerplates that break the moment you try to deploy them

If you are an **indie hacker**, **agency owner**, **startup CTO**, or **full-stack engineer** who needs to ship a multi-tenant SaaS in days — not months — this is your starting line.

---

## 🚀 What Cortex Solves

Most SaaS boilerplates give you a login page and call it a day. Cortex gives you a **battle-tested architecture** that handles the hard problems so you can focus on your product:

| Problem | How Cortex Solves It |
|---------|---------------------|
| **Tenant Data Leakage** | PostgreSQL Row-Level Security (RLS) + AsyncLocalStorage request isolation — every query is scoped to the current tenant by default |
| **Auth Complexity** | JWT access/refresh tokens with rotation, reuse detection, role-based access control (RBAC), and atomic user+tenant provisioning |
| **Billing Nightmares** | Stripe Checkout + Webhooks with idempotency, grace periods, plan tiers, and a mock sandbox mode for local development without API keys |
| **Frontend/Backend Sync** | Next.js 15 App Router with Server Actions, automatic tenant context propagation, and JWT refresh handling |
| **Deployment Anxiety** | Complete Terraform AWS infrastructure (ECS Fargate, RDS, Redis, ALB) with CI/CD pipeline and Docker Compose for local development |
| **Security Blind Spots** | Helmet headers, strict CORS, input validation, sanitized error responses, and CloudWatch monitoring out of the box |

---

## 🏗 Architecture at a Glance

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│   Client    │────▶│  Next.js 15 │────▶│      NestJS API (ECS)       │
│  (Browser)  │     │  (Frontend) │     │  ┌─────────────────────┐    │
└─────────────┘     └─────────────┘     │  │ AsyncLocalStorage   │    │
                                        │  │ Tenant Context      │    │
                                        │  │ RLS Defense-in-Depth│    │
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
                                        │  │  Sessions / Rate Limit│    │
                                        │  └─────────────────────┘    │
                                        └─────────────────────────────┘
```

**Key Design Decisions:**
- **RLS + Application Filtering**: We use PostgreSQL RLS as a safety net, but enforce tenant isolation at the application layer via `AsyncLocalStorage` — eliminating connection pool leakage risks.
- **Schema-per-Tenant is Overkill**: RLS on shared tables scales to 10,000+ tenants without operational complexity.
- **Request-Scoped Everything**: Tenant context lives in `AsyncLocalStorage`, not global variables or connection sessions.

---

## ✨ Features

### Multi-Tenancy
- ✅ Subdomain routing (`tenant.yourapp.com`)
- ✅ Custom domain support (`client.com`)
- ✅ Automatic tenant resolution via middleware
- ✅ Tenant-aware repository base class (all queries filtered by default)
- ✅ Atomic tenant provisioning (user + tenant + owner membership in one transaction)

### Authentication & Authorization
- ✅ JWT access tokens (15 min) + refresh tokens (7 days)
- ✅ Refresh token rotation with reuse detection (instant session revocation)
- ✅ Role-based access control: Owner, Admin, Member, Viewer
- ✅ Rate limiting (5 failed attempts per 15 minutes)
- ✅ Password reset with signed, single-use tokens
- ✅ Soft delete on all entities (audit trail preserved)

### Billing & Subscriptions
- ✅ Stripe Checkout integration
- ✅ Webhook handling with signature verification
- ✅ Idempotency protection (duplicate events ignored)
- ✅ Grace period logic (7 days before locking on `past_due`)
- ✅ Plan tier management (Free, Starter, Pro, Enterprise)
- ✅ Mock sandbox mode (develop billing without Stripe keys)

### Frontend (Next.js 15)
- ✅ App Router with Server Actions
- ✅ Tenant context propagation via middleware
- ✅ Automatic JWT refresh on 401
- ✅ Zustand auth state + TanStack Query
- ✅ Responsive dashboard with billing settings
- ✅ Suspense-safe static generation

### Infrastructure & DevOps
- ✅ Terraform AWS infrastructure (VPC, ECS, RDS, Redis, ALB)
- ✅ Docker multi-stage builds (frontend + backend)
- ✅ Docker Compose for local development
- ✅ GitHub Actions CI/CD (lint → test → build → deploy)
- ✅ Health checks for app, database, Redis, and Stripe
- ✅ CloudWatch alarms and monitoring

### Security
- ✅ Helmet security headers (CSP, HSTS, X-Frame-Options)
- ✅ Strict CORS (no wildcards)
- ✅ Input validation and sanitization
- ✅ Sanitized error responses (no stack traces in production)
- ✅ Correlation ID logging with sensitive field redaction

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10, TypeScript, TypeORM |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Database** | PostgreSQL 15 with RLS |
| **Cache** | Redis (ioredis) |
| **Auth** | Passport, JWT, bcrypt |
| **Billing** | Stripe |
| **Infrastructure** | AWS (ECS Fargate, RDS, ElastiCache, ALB, S3) |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions |
| **Containers** | Docker, Docker Compose |

---

## 📦 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone & Install
```bash
git clone https://github.com/AhmadS7/cortex.git
cd cortex
npm install
cd frontend && npm install && cd ..
```

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env with your values:
# - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET, JWT_REFRESH_SECRET
# - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional for sandbox mode)
# - REDIS_URL
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

### 4. Run Migrations
```bash
npm run migration:run
```

### 5. Seed Demo Data (Optional)
```bash
npm run seed
```

### 6. Access the App
- **Frontend**: http://localhost:3001
- **API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/v1/health

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests (requires test database)
npm run test:e2e

# Test coverage
npm run test:cov
```

All 17 E2E tests covering authentication, tenant isolation, and billing must pass before deployment.

---

## 🚀 Production Deployment

### Option A: Terraform (AWS)
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

This provisions:
- VPC with public/private subnets
- ECS Fargate (auto-scaling)
- RDS PostgreSQL (private, encrypted)
- ElastiCache Redis (private, auth-enabled)
- Application Load Balancer with SSL
- CloudWatch monitoring

### Option B: Docker Compose (Self-Hosted)
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 📖 Documentation

- [Architecture Decision Records (ADRs)](./docs/adr/)
  - [ADR-001: Why RLS + AsyncLocalStorage over Schema Isolation](./docs/adr/0001-multi-tenant-architecture.md)
- [API Documentation](http://localhost:3000/api/docs) (Swagger UI)
- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## 🎓 Learning & Teaching

This repository is designed as a **reference architecture** for:

- **Junior Developers** learning how production SaaS auth and tenancy work
- **Senior Engineers** interviewing for Staff+ roles (system design discussions)
- **Startup Founders** who need to ship an MVP without hiring a DevOps team
- **Agencies** white-labeling SaaS products for multiple clients

Every architectural decision is documented. Every security measure is explained. The code is production-grade but readable.

---

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Security vulnerability reporting

---

## 📝 License

[MIT](./LICENSE) — Use it for personal projects, client work, or commercial products. Attribution appreciated but not required.

---

## 👤 About the Author

**Ahmad Shah** is a self-taught software engineer with 10+ years of experience building production systems across frontend, backend, and infrastructure. Cortex was built to solve a real problem: every SaaS project starts with the same 3 months of boilerplate. This is the boilerplate I wish I had when I started.

> *"I built Cortex because I was tired of rebuilding auth, billing, and tenancy for every client project. Now I spin up a new SaaS in hours, not weeks. I hope it saves you the same time."* — **Ahmad Shah**

---

## 🌟 Show Your Support

If this project helped you ship faster, please consider:
- ⭐ Starring the repository
- 🐦 Sharing it on Twitter/X or LinkedIn
- 📝 Writing about your experience using it
- 💡 Opening an issue with feedback or feature requests

**Your support helps keep this project maintained and improved.**

---

## 🔗 Links

- **Repository**: https://github.com/AhmadS7/cortex
- **Issues & Roadmap**: https://github.com/AhmadS7/cortex/issues
- **Discussions**: https://github.com/AhmadS7/cortex/discussions

---

<p align="center">
  <strong>Built with discipline. Shipped with confidence.</strong><br>
  <sub>© 2026 Ahmad Shah. All rights reserved.</sub>
</p>
