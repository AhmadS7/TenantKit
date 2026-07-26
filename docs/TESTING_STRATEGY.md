# Testing Architecture & Strategy

## Philosophy & Core Principles

This repository enforces an **AI-First, Quality-Gated Engineering Philosophy**. Code quality is verified automatically through strict testing pyramids, coverage thresholds, static analysis, and mutation testing rather than relying solely on manual reviews.

1. **Automation Over Manual Verification**: Every line of domain logic must be verified by automated tests.
2. **Convention Over Configuration**: Consistent file naming, test organization, and directory layout.
3. **Maintainability Over Cleverness**: Explicit, clear test logic without magical state or obscure helpers.
4. **Resilient Assertions**: Avoid testing implementation details; test behaviors, API contracts, and user interactions.

---

## Testing Pyramid & Distribution

```
           /\
          /  \         5% End-to-End (E2E) Tests
         / E2E \       - Full API workflows, auth flows, database persistence
        /-------\
       /   BDD   \     10% Behavior-Driven Specifications (Cucumber/Gherkin)
      /-----------\    - Executable business scenarios & domain features
     / Integration \   25% Integration Tests
    /---------------\  - DB repositories, NestJS modules, API client integration
   /   Unit Tests    \ 60% Unit Tests
  /-------------------\- Services, guards, hooks, pipes, utilities, state stores
```

---

## What to Test vs. What to Mock

### 1. Unit Tests (60%)
- **Backend**:
  - **Services**: Business logic, rules, calculations, data transformations.
  - **Guards**: Role checking, JWT validation logic.
  - **Pipes & Interceptors**: Request payload transformations, response formatting, tenant RLS header injection.
  - **Filters**: Exception response mapping.
  - **Decorators**: Metadata reflection.
- **Frontend**:
  - **Custom Hooks**: State updates, side effects, async data mutations.
  - **Zustand Stores**: State transitions, resets, actions.
  - **Utilities**: Helper functions, formatters, validation schemas.

### 2. Integration Tests (25%)
- **Backend**:
  - **Modules**: Dependency resolution, provider wiring.
  - **Repositories**: `TenantAwareRepository` queries, multi-tenant database isolation.
  - **Database Layer**: Entity listeners, cascade behaviors.
- **Frontend**:
  - **Pages**: Form submissions, validation error messages, navigation triggers.
  - **API Integration**: TanStack React Query hooks connected to mock API servers.

### 3. Behavior Driven Development (10%)
- Gherkin `.feature` specifications executing end-to-end user scenarios.
- Verifies business intent (e.g., login success, locked account, user management, dashboard authorization).

### 4. End-to-End Tests (5%)
- Real HTTP requests against running NestJS NestApplication.
- Validates full stack integration: Route -> Guard -> Interceptor -> Service -> Database.

---

## Mocking Rules & Expectations

| Component | Strategy | Justification |
| :--- | :--- | :--- |
| **External APIs** (Stripe, SMTP) | **ALWAYS Mock** | Prevents network flakiness, external cost, and side effects. |
| **Redis / Queues** | **Mock in Unit, Real/In-Memory in E2E** | Isolates unit tests while ensuring queue execution in E2E. |
| **Database** | **Mock Repositories in Unit, SQLite/Test DB in Integration/E2E** | Ensures speed in unit tests, correctness in DB tests. |
| **Browser APIs / Storage** | **Mock via Jest (`localStorage`, `fetch`)** | Emulates browser environment deterministically. |
| **Domain Entities & Logic** | **NEVER Mock** | Pure functions and domain models must execute as written. |

---

## Naming & Directory Conventions

### Backend (NestJS)
- Unit Tests: `src/**/*.spec.ts` (Colocated with source code)
- Integration Tests: `test/integration/**/*.integration-spec.ts`
- E2E Tests: `test/*.e2e-spec.ts` or `test/e2e/**/*.e2e-spec.ts`
- Shared Test Utilities: `test/utils/`

### Frontend (React / Next.js)
- Component & Page Tests: `frontend/__tests__/components/*.test.tsx`
- Hook Tests: `frontend/__tests__/hooks/*.test.ts`
- Utility Tests: `frontend/__tests__/utils/*.test.ts`
- Shared Test Utilities: `frontend/__tests__/utils/`

### BDD (Gherkin)
- Feature files: `features/*.feature`
- Step definitions: `features/step_definitions/*.steps.ts`

---

## Shared Test Infrastructure

All test suites utilize shared test utilities to eliminate boilerplate:
- **Factories**: Builder functions for generating valid domain entities and DTOs.
- **Fixtures**: Standardized request payloads and responses.
- **Database Seeder**: Resets and populates test databases between runs.
- **Fake Auth Helper**: Generates valid signed JWT tokens for test tenants.
- **Custom Matchers**: Specialized assertions (e.g., `toBeValidJwt`, `toHaveTenantHeader`).
