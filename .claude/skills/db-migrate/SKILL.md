---
name: db-migrate
description: Author a TenantKit TypeORM migration + sibling RLS policy SQL pair. Use when adding a new entity, altering a tenant-scoped table, or whenever a migration is needed. Trigger: "add migration", "schema change", "new entity", "create table", "alter column".
---

# /db-migrate

Spawn the `migration-author` subagent (defined in [`.claude/agents/migration-author.md`](../../agents/migration-author.md)) to generate a paired TypeORM migration + RLS SQL file.

## When to use

- Adding a new entity / table
- Altering a tenant-scoped table (new column, new index, new FK)
- Renaming a column on a table that participates in RLS
- The user explicitly asks "add a migration"

## What to do

1. **Confirm the target.** If the user added a new `*.entity.ts` file, use that. If they want to alter an existing table, ask which.
2. **Confirm whether the table is tenant-scoped.** Every tenant-scoped table needs the paired `.sql` file. Tables that are not tenant-scoped (e.g. a `migrations` ledger, a `webhook_events` dedupe table) do not need RLS policies but should still be in the audit so the user can confirm.
3. **Spawn `migration-author`** with the entity path or table name.
4. **Read the agent's output.** It will emit two files (or one, for non-tenant-scoped). Verify:
   - Timestamp matches `Date.now()` format (13 digits)
   - `up` and `down` are mirror images
   - The `.sql` file uses `current_setting('app.current_tenant', true)::uuid` and pairs `USING` with `WITH CHECK`
   - Indexes include `(tenant_id, <common-WHERE>)` if the table is tenant-scoped
5. **Show the diff to the user** before writing. Do not auto-apply.
6. **Offer to run:**
   - `pnpm exec typeorm migration:generate src/migrations/<timestamp>-<name>.ts` (TypeORM will fill the boilerplate)
   - Or hand-write if the user prefers the agent's output
   - Or hand-write both `.ts` + `.sql` and run `pnpm exec typeorm migration:run` against a scratch DB
7. **Recommend `/rls-audit`** after the migration is applied.

## Reference files

- [src/migrations/1735774100000-create-base-tables.ts](../../../src/migrations/1735774100000-create-base-tables.ts) — base table shape
- [src/migrations/1735774200000-enable-rls.ts](../../../src/migrations/1735774200000-enable-rls.ts) + the `.sql` sibling — RLS pattern
- [src/migrations/1735774300000-add-indexes.ts](../../../src/migrations/1735774300000-add-indexes.ts) — index pattern
- [src/common/interceptors/rls.interceptor.ts](../../../src/common/interceptors/rls.interceptor.ts) — what sets `app.current_tenant`

## Boundaries

- Never edit an already-committed migration. Author a new one.
- Never drop a table or column without explicit `--confirmed` flag in the bash command.
- Never add a `.sql` for a non-tenant-scoped table.
- Never add a data backfill to the same migration as a schema change. Split into two.
