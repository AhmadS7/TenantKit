---
name: rls-audit
description: Audit a TenantKit table or entity for RLS coverage and multi-tenant safety. Trace entity to migration to RLS policy to interceptor. Trigger: "audit RLS", "check tenant isolation", "review RLS policy", "is this table tenant-scoped?".
---

# /rls-audit

Spawn the `rls-auditor` subagent (defined in [`.claude/agents/rls-auditor.md`](../../agents/rls-auditor.md)) and report its findings.

## When to use

- A new `*.entity.ts` has been added under `src/`
- A new migration creates or alters a tenant-scoped table
- The user wants a pre-deploy safety check
- The user asks "is my data actually isolated per tenant?"

## What to do

1. **Identify the target.** If the user named a table or entity, use that. Otherwise, audit every `*.entity.ts` under `src/`.
2. **Spawn the `rls-auditor` subagent** with the target. Pass the entity path(s) as input.
3. **Read the agent's report.** It will be in the format defined in the agent spec (severity-tagged findings + summary table).
4. **Surface blockers first.** If the agent flagged any `blocker`, list them at the top of the user-facing response.
5. **Offer the fix path.** For each blocker, suggest either:
   - Spawn `/db-migrate` to author the missing policy SQL
   - Edit the route exclude list at [src/app.module.ts:107-128](../../src/app.module.ts) **only if** the user explicitly approves (this is an architectural change, not a code fix)
6. **Do not auto-apply.** The user reviews and applies.

## Reference files

- [src/common/interceptors/rls.interceptor.ts](../../../src/common/interceptors/rls.interceptor.ts)
- [src/tenancy/tenant-context.ts](../../../src/tenancy/tenant-context.ts)
- [src/migrations/1735774200000-enable-rls.sql](../../../src/migrations/1735774200000-enable-rls.sql)
- [src/migrations/1735774400000-fix-rls-policies.sql](../../../src/migrations/1735774400000-fix-rls-policies.sql)
- [src/app.module.ts](../../../src/app.module.ts) lines 107-128 (TenantMiddleware exclude list)

## Example

```
User: "audit RLS for the orders table"
→ Spawn rls-auditor with target=src/orders/order.entity.ts
→ Agent returns:
   ## orders
   severity: blocker
   - [✗] RLS not enabled — no policy found in 1735774200000-enable-rls.sql or 1735774400000-fix-rls-policies.sql
   - [✗] Missing index on (tenant_id, created_at)
   - [✓] Routed through RlsInterceptor (OrdersController is in OrdersModule which inherits APP_INTERCEPTOR)
   recommendation: author a new migration that enables RLS on orders and adds the composite index
→ Surface the blocker, suggest /db-migrate to author the fix.
```
