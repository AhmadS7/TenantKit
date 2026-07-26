# Comprehensive QA Playbook & Quality Strategy

## Overview

This playbook defines the Quality Assurance standards, developer checklists, release validation matrices, and verification protocols for **TenantKit**.

---

## QA Checklists

### 1. Developer Pre-Commit Checklist
Before submitting a pull request or pushing code:
- [ ] Run `pnpm run typecheck` to verify zero TypeScript errors.
- [ ] Run `pnpm run lint` to enforce formatting and static rules.
- [ ] Write unit tests for all new services, hooks, utilities, or components.
- [ ] Run `pnpm test` and ensure all unit/integration tests pass cleanly.
- [ ] Verify unit test coverage remains >= 80% with `pnpm run coverage`.
- [ ] Verify feature functionality locally via `pnpm run dev`.

### 2. Pull Request (PR) Gate Checklist
Required before merging into `main`:
- [ ] CI/CD Quality Pipeline status is GREEN.
- [ ] Code passes static analysis (Knip unused exports & Madge circular dependency checks).
- [ ] BDD scenarios (`pnpm run test:bdd`) pass without failures.
- [ ] Mutation score meets or exceeds 60% threshold (`pnpm run test:mutation`).
- [ ] Architectural guidelines (`AGENTS.md`) and security patterns have been followed.

### 3. Manual QA Checklist
Used for manual feature verification before major releases:
- [ ] **Authentication Flow**: Verify registration, login, logout, password reset, and token rotation.
- [ ] **Multi-Tenancy Isolation**: Confirm headers/subdomains filter tenant data strictly without leakage.
- [ ] **Billing Integration**: Test subscription state upgrades and webhook handlers.
- [ ] **Form Validation**: Trigger edge-case input failures and verify user-friendly UI errors.

---

## Verification Strategies Matrix

| Strategy | When to Execute | Scope / Tools | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Smoke Testing** | Post-deployment / Staging | Core auth & ping endpoints (`/health`) | Instant verification of deployment health. |
| **Regression Testing** | Pre-release | Automated E2E & BDD suites (`pnpm test:e2e`) | Prevent regressions in existing features. |
| **Accessibility (a11y)** | PR review & component design | `@testing-library/react`, ARIA attributes | Ensure WCAG AA compliance for screen readers. |
| **Cross-Browser** | Feature release | Chrome, Firefox, Safari, Edge | Verify layout & interactivity across engines. |
| **Performance** | Sprint end / CI build | Lighthouse, bundle size analyzer | Maintain page load speeds and API latency. |
| **Security Audit** | Weekly / CI security job | `npm audit`, `eslint-plugin-security` | Identify vulnerable dependencies and OWASP risks. |

---

## Release Validation Protocol

1. **Phase 1: Automated Verification**
   - Run full pipeline: `pnpm run ci`
2. **Phase 2: Staging Smoke Verification**
   - Deploy to staging environment.
   - Execute health checks and key scenario smoke tests.
3. **Phase 3: Final Release Signoff**
   - Verify green status on all CI quality gates and deploy to production.
