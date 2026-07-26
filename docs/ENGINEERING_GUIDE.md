# Master Engineering & Testing Guide

## 1. Testing Philosophy

TenantKit is built on an **AI-First, Automated Quality Assurance** philosophy:
- **Automation Over Manual Review**: Quality gates enforce standards programmatically.
- **Convention Over Configuration**: Strict file naming and directory structure across NestJS and Next.js.
- **Maintainability Over Cleverness**: Code must be explicit, self-documenting, and resilient to refactoring.

---

## 2. Monorepo Architecture

```
TenantKit/
├── src/                      # NestJS Backend Application
│   ├── auth/                 # Authentication & Token Management
│   ├── tenancy/              # Multi-tenant Context & Storage
│   ├── common/               # Filters, Interceptors, Repositories
│   └── users/                # User Domain
├── frontend/                 # Next.js 16 + React 19 Frontend
│   ├── src/app/              # App Router Pages
│   ├── src/store/            # Zustand Stores
│   └── __tests__/            # Frontend Unit & Component Tests
├── test/                     # Backend Integration & E2E Tests
│   └── utils/                # Shared Factories, Fake Auth, Seeders
├── features/                 # Cucumber BDD Gherkin Specifications
│   └── step_definitions/     # Executable Cucumber Step Handlers
├── scripts/                  # Quality Metrics & Analysis Scripts
└── docs/                     # Architecture & Quality Documentation
```

---

## 3. How to Write Tests

### Writing Unit Tests (Backend)
Colocate unit tests with source files (`src/<module>/<name>.spec.ts`):
```typescript
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, /* Mock Providers */],
    }).compile();
    service = module.get(AuthService);
  });

  it('validates user credentials', async () => {
    // Assert logic
  });
});
```

### Writing Component & Store Tests (Frontend)
Place component tests in `frontend/__tests__/`:
```typescript
import { render, screen } from '@testing-library/react';
import LoginPage from '../src/app/login/page';

describe('LoginPage', () => {
  it('renders form controls', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText(/workspace/i)).toBeInTheDocument();
  });
});
```

### Writing BDD Feature Specs
Define feature files in `features/*.feature`:
```gherkin
Feature: User Login
  Scenario: Successful login
    Given a registered user with email "admin@tenantkit.com" and password "SecurePass123!"
    When the user submits valid login credentials
    Then the authentication response returns an access token
```

---

## 4. Running Mutation Testing

Mutation testing evaluates test suite resiliency by introducing artificial code bugs (mutants) and verifying if test suites catch them.
Run mutation testing locally:
```bash
pnpm run test:mutation
```
Reports are output to `reports/mutation/html/index.html`.

---

## 5. Quality Gates & Coverage Requirements

- **Statement Coverage**: >= 80%
- **Branch Coverage**: >= 80%
- **Function Coverage**: >= 80%
- **Line Coverage**: >= 80%
- **Mutation Threshold**: >= 60%

---

## 6. Developer Workflow Commands

| Task | Command |
| :--- | :--- |
| **Start Development Server** | `pnpm run dev` |
| **Run Unit Tests** | `pnpm test` |
| **Run BDD Features** | `pnpm run test:bdd` |
| **Run E2E Suite** | `pnpm run test:e2e` |
| **Run Mutation Testing** | `pnpm run test:mutation` |
| **Verify Engineering Metrics**| `pnpm run quality` |
| **Full CI Quality Pipeline** | `pnpm run ci` |

---

## 7. Troubleshooting

- **TypeScript Errors**: Run `pnpm run typecheck` to locate exact line locations.
- **Coverage Failures**: Check `coverage/index.html` to discover untested branches or lines.
- **BDD Step Mismatches**: Ensure step definition regex matches `.feature` text exactly.
