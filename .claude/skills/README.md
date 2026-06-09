# TenantKit Custom Skills

Project-local Claude Code skills. Each skill is a directory containing a `SKILL.md` file
with YAML frontmatter (`name`, `description` including trigger phrases) and the procedure
the model follows when the skill is invoked.

Skills live under `.claude/skills/` (project-scoped, committed). They are auto-discovered
by Claude Code the same way `~/.claude/skills/` skills are, but only when working in this repo.

## Index

| Skill | Trigger phrases | Use when |
|---|---|---|
| `rls-audit/` | "audit RLS", "check tenant isolation", "review policy" | Verify a table has RLS coverage and the right policy |
| `tenant-trace/` | "trace tenant", "where does tenantId come from" | Understand the path from request to SQL for a given route |
| `stripe-debug/` | "replay stripe webhook", "test billing flow" | Send a synthetic Stripe event into the local backend |
| `db-migrate/` | "add migration", "schema change", "new entity" | Author a paired `.ts` + `.sql` migration |
| `env-check/` | "check env", "missing env vars" | Diff `.env` vs `.env.example` and warn on missing required keys |
| `pr-review/` | "review pr", "review this PR" | Run the TenantKit review lenses (RLS, NestJS, Next.js, Stripe) |
| `commit/` | "commit", "git commit" | Wrap `getsentry/commit` with the TenantKit commit trailer |
| `frontend-test/` | "run frontend test", "jest frontend" | Run a single Jest test in `frontend/` with watch toggle |

## How to add a new skill

1. Create `.claude/skills/<kebab-name>/SKILL.md`.
2. Add YAML frontmatter:
   ```yaml
   ---
   name: <kebab-name>
   description: <one-line + trigger phrases separated by "Trigger:">
   ---
   ```
3. Keep `SKILL.md` under 500 lines. Move long procedures to sibling `references/<topic>.md` and link from `SKILL.md`.
4. Avoid generic trigger words ("code", "review", "fix", "create", "update") — they collide with other skills and confuse the router. Be specific: "audit RLS policy", "replay stripe webhook", "trace tenant context".
5. Run `mcp__skillsmith__skill_pack_audit --pack_path .claude --check_trigger_quality true` to verify no collisions with registry skills under `~/.claude/skills/`.

## Conventions

- All file paths in skill procedures are **repo-relative** so they work in a fresh worktree.
- All shell commands assume `git`, `pnpm`, `jq` are on `$PATH`.
- All bash examples are run from the repo root unless the skill explicitly says otherwise.
- No skill should call `mcp__*` tools directly — the model decides which MCP to use; the skill only describes the procedure.
