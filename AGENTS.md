# AGENTS.md - AI Coding Agent Governance & Instructions

## Core Philosophy

This repository is designed for **AI-Human Pair Engineering**. All code written by AI agents must strictly satisfy automated quality gates before it can be merged into `main`.

---

## Mandates & Constraints for AI Agents

### 1. Mandatory Test Creation
- **Rule**: Every new service, controller, hook, or utility added by an AI agent MUST include corresponding unit tests (`*.spec.ts` or `*.test.tsx`).
- **Rule**: Adding business logic without unit tests is an automatic violation of the Definition of Done.

### 2. Never Suppress Quality Gates
- **Rule**: NEVER comment out failing assertions, bypass ESLint rules (`eslint-disable`), or use `@ts-ignore` to pass CI.
- **Rule**: Fix the underlying code contract or update the test mock properly.

### 3. Folder & Architectural Conventions
- **Backend (NestJS)**:
  - Modules in `src/<feature>/<feature>.module.ts`.
  - Services in `src/<feature>/<feature>.service.ts`.
  - Colocated Unit Tests: `src/<feature>/<feature>.service.spec.ts`.
  - Multi-tenant DB queries MUST extend `TenantAwareRepository` or use `tenantStorage`.
- **Frontend (Next.js)**:
  - App Router routes in `frontend/src/app/`.
  - Shared state stores in `frontend/src/store/`.
  - Unit/Component tests in `frontend/__tests__/`.

---

## Instructions for AI Agents

### How to Generate Tests
1. Inspect existing factories in `test/utils/factories.ts`.
2. Follow standard NestJS `Test.createTestingModule` pattern.
3. Test edge cases, validation errors, and null values—not just happy paths.

### How to Add a New Backend Module
1. Create directory `src/<module_name>`.
2. Create `<module_name>.entity.ts` if database persistence is needed.
3. Create `<module_name>.service.ts` and `<module_name>.controller.ts`.
4. Immediately write `<module_name>.service.spec.ts`.
5. Register in `src/app.module.ts`.

---

## Definition of Done (DoD)

A pull request or feature is complete ONLY when:
1. `pnpm run typecheck` passes with zero TypeScript errors.
2. `pnpm run lint` passes without errors.
3. `pnpm test` passes all unit and integration test suites.
4. `pnpm run test:bdd` passes all Gherkin feature scenarios.
5. Unit test coverage remains >= 80%.
6. Production build (`pnpm run build`) compiles cleanly.
