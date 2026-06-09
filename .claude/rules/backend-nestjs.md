---
paths:
  - "src/**/*.ts"
---

# Backend — NestJS Rules

Applies to every file under `src/`.

## Module wiring

- New services listed in `providers[]`; new repositories imported via `TypeOrmModule.forFeature([…])`
- New env vars go in [src/config/env.validation.ts](../config/env.validation.ts) (Joi schema). Read with `ConfigService.getOrThrow(...)` — never `process.env.X` directly
- Guards/interceptors are either global (via `APP_GUARD` / `APP_INTERCEPTOR` in [src/app.module.ts](../app.module.ts)) or class-level (`@UseGuards(...)`). Do not mix

## Controller shape

- All inputs typed with a DTO in `./dto/*.dto.ts` (class-validator)
- `@Public()` only on auth + billing/webhook + health routes (compare to [src/app.module.ts:107-128](../app.module.ts))
- HTTP status codes follow [`.claude/rules/rest-api.md`](rest-api.md)
- POST → 201, PUT/PATCH → 200, DELETE → 204; non-idempotent POST that touches money/provisioning needs Idempotency-Key support

## Service shape

- No `any` in public signatures
- Errors thrown as `BadRequestException` / `NotFoundException` / `UnauthorizedException` / `ForbiddenException` / `UnprocessableEntityException` — not raw `Error`
- Side effects (email, queue) go through their respective services, not inlined

## Migrations

- Migrations are forward-only; never edit a committed one
- New tenant-scoped tables need a paired `.ts` + sibling `.sql` file with RLS enable + policy. Spawn `/db-migrate` or `migration-author`
- `synchronize: true` is dev-only. Never include in migrations

## RLS

- The only sanctioned path to the DB for tenant data is the `RlsInterceptor`-wrapped transaction. Do not bypass.
- Bypassing requires an ADR + adding the route to [src/app.module.ts:107-128](../app.module.ts) exclude list with a comment

## Tests

- `*.spec.ts` sibling for new code; happy path + one error path minimum
- External services (Stripe, Redis, Postgres) mocked
- E2E under `test/`, not `src/`

## Reference

- [src/app.module.ts](../app.module.ts)
- [src/main.ts](../main.ts)
- [src/common/interceptors/rls.interceptor.ts](../common/interceptors/rls.interceptor.ts)
- [src/config/env.validation.ts](../config/env.validation.ts)
- [`.claude/rules/rest-api.md`](rest-api.md)
