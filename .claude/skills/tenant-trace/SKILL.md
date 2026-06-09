---
name: tenant-trace
description: Trace the tenant context from the inbound request through TenantMiddleware, AsyncLocalStorage, and RlsInterceptor to the final SQL. Use to answer "where does tenantId come from?", "is this route tenant-scoped?", or "why am I seeing rows from another tenant?".
---

# /tenant-trace

Trace the path the current request takes to become a tenant-scoped SQL query.

## When to use

- The user is debugging a tenant-isolation bug (e.g. "users in tenant A are seeing tenant B's data")
- The user asks "is this route tenant-scoped?"
- The user is adding a new route and wants to know if it needs `TenantMiddleware` / `RlsInterceptor`
- Onboarding a new contributor who needs to understand the multi-tenant flow

## Procedure

1. **Start at the entry point.** Find the route. The user usually names the controller, e.g. `OrdersController.list`. If not, ask.
2. **Read the controller.** Confirm:
   - The path is **not** in the [TenantMiddleware exclude list](../../app.module.ts) (lines 107-128 of [src/app.module.ts](../../../src/app.module.ts))
   - If it is excluded, that is by design — stop and explain
3. **Follow the middleware.** Read [src/tenancy/tenant.middleware.ts](../../../src/tenancy/tenant.middleware.ts). It sets `tenantId` in [src/tenancy/tenant-context.ts](../../../src/tenancy/tenant-context.ts) (the `AsyncLocalStorage`) by resolving the host header.
4. **Follow the interceptor.** Read [src/common/interceptors/rls.interceptor.ts](../../../src/common/interceptors/rls.interceptor.ts). It opens a transaction, sets the role to `tenantkit_app`, and calls `set_config('app.current_tenant', $1)`.
5. **Follow the SQL.** Find the repository call in the service. It should NOT explicitly filter by `tenantId` in the WHERE clause — RLS does that. If you see explicit `WHERE tenantId = ...` filters, note them; they are belt-and-suspenders and not wrong, but they should match what RLS already enforces.
6. **Check the entity.** Read the entity. Confirm it has `tenantId` (or inherits from a base entity that has it) and the corresponding `tenant_id` column is in the table.

## Output format

Draw a numbered path:

```
1. HTTP request: GET /v1/orders
2. TenantMiddleware sets AsyncLocalStorage.tenantId = <uuid> from host header
3. TenantGuard (global) checks that the host resolves to a real tenant
4. RlsInterceptor (global) opens transaction, runs:
     SET LOCAL ROLE tenantkit_app;
     SELECT set_config('app.current_tenant', <uuid>, true);
5. OrdersController.list runs OrdersService.findAll
6. OrdersService.findAll calls ordersRepository.find() — no explicit WHERE
7. RLS policy on orders table filters rows to current tenant
8. Response sent
```

For each numbered step, link to the file and line where the action happens. If any step is missing or wrong, flag it.

## Common pitfalls to surface

- **Route in the exclude list but it should not be.** E.g. a billing read endpoint accidentally matches the webhook exclude. Flag it.
- **No `set_config` call.** Means the policy cannot match anything. Flag as a blocker.
- **Explicit `WHERE tenantId = X` AND no RLS policy.** Means RLS is doing nothing and the explicit filter is the only safety net. Flag as a warning.
- **`SET LOCAL ROLE` is missing.** Means RLS policies don't apply (superuser bypass). Flag as a blocker.

## Reference files

- [src/tenancy/tenant.middleware.ts](../../../src/tenancy/tenant.middleware.ts)
- [src/tenancy/tenant.guard.ts](../../../src/tenancy/tenant.guard.ts)
- [src/tenancy/tenant-context.ts](../../../src/tenancy/tenant-context.ts)
- [src/common/interceptors/rls.interceptor.ts](../../../src/common/interceptors/rls.interceptor.ts)
- [src/app.module.ts](../../../src/app.module.ts) lines 86-101 (global guard/interceptor wiring), 103-130 (middleware exclude)
- [src/migrations/1735774200000-enable-rls.sql](../../../src/migrations/1735774200000-enable-rls.sql)
