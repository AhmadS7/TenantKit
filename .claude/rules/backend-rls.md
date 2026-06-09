---
paths:
  - "src/migrations/**"
---

# Backend — RLS Migration Rules

Applies to every file under `src/migrations/`.

## Pair pattern (mandatory for tenant-scoped tables)

Every tenant-scoped table migration ships as **two files with the same stem**:

1. `<timestamp>-<kebab-name>.ts` — TypeORM `up` / `down`
2. `<timestamp>-<kebab-name>.sql` — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` + supporting index

`<timestamp>` is `Date.now()` (13 digits). Example: `1735774100000`.

## RLS policy shape

```sql
ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_<table>" ON "<table>"
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true)::uuid);
```

- Always `USING` + `WITH CHECK` together
- `current_setting('app.current_tenant', true)` — the `true` makes it return NULL on miss instead of erroring; cast to `uuid` after
- `FORCE ROW LEVEL SECURITY` so the policy applies even to the table owner

## Indexes

- Every `(tenant_id, <common-WHERE-column>)` gets an index. Naming: `idx_<table>_<col1>_<col2>`
- New FK columns get an index by default

## Forward-only

- Never edit a committed migration. Author a new one.
- Never include `synchronize: true` in a migration.
- Never combine schema change + data backfill in one migration. Split.

## Reference

- [src/migrations/1735774200000-enable-rls.sql](../migrations/1735774200000-enable-rls.sql)
- [src/migrations/1735774400000-fix-rls-policies.sql](../migrations/1735774400000-fix-rls-policies.sql)
- [src/common/interceptors/rls.interceptor.ts](../common/interceptors/rls.interceptor.ts)
- [`migration-author`](../agents/migration-author.md) subagent
- [`/db-migrate`](../skills/db-migrate/SKILL.md) skill
