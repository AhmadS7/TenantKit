# AI Coding Guidelines & Operational Rules

## Operational Standards for AI Assistants

When assisting with code generation or refactoring in **TenantKit**, follow these explicit engineering practices:

### 1. Code Style & Architecture
- Use explicit TypeScript types. Avoid `any`.
- Keep functions small and focused on a single responsibility (< 40 lines).
- Prefer composition over deep inheritance.
- Always handle errors with appropriate HTTP Status Codes or custom exceptions.

### 2. Multi-Tenancy Rules
- Never perform raw SQL queries without incorporating tenant ID filters or RLS contexts.
- Use `tenantStorage.getStore()` to retrieve current request tenant context.

### 3. Testing Standard Operating Procedure
- **Unit Tests**: Mock external dependencies (`Repository`, `JwtService`, `EmailQueueService`).
- **Integration Tests**: Use SQLite in-memory or Postgres test container with `test-db-setup.js`.
- **BDD Specs**: Update `.feature` files whenever domain requirements change.

### 4. PR Submission Verification Checklist
Run the unified CI command before submitting work:
```bash
pnpm run ci
```
If any gate fails, resolve the root cause before completing the task.
