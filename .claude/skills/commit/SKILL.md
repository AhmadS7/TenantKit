---
name: commit
description: Create a conventional-commit-formatted commit for TenantKit, wrapping the getsentry/commit registry skill and adding a TenantKit commit trailer. Trigger: "commit", "git commit", "save changes", "commit message".
---

# /commit

Local wrapper that delegates to the registry `getsentry/commit` skill and appends a
TenantKit-specific trailer to the commit body. Keeps commit-message conventions consistent
with the rest of the Sentry-using world and adds a project-local hook so downstream tooling
can parse the body.

## When to use

- The user has unstaged or staged changes ready to commit
- The user asks "commit this", "git commit", "make a commit"

## Procedure

1. **Delegate to the registry `commit` skill** (Sentry, installed via `mcp__skillsmith__install_skill` on `getsentry/commit`). That skill produces the conventional-commit subject and body.
2. **Append the `TenantKit-Change:` trailer** to the body. The trailer is a single line at the end of the body that lists the modules touched, in a stable order:

   ```
   TenantKit-Change: backend/<module1>, backend/<module2>, frontend/<module3>, infra, docs
   ```

   Rules:
   - Lowercase, kebab-case module names matching the directory under `src/`
   - Comma-separated, no trailing comma
   - If a frontend file changed, prefix with `frontend/`
   - If a Terraform file changed under `infrastructure/`, use `infra`
   - If only docs, use `docs`
3. **Stage the changes** if the user has not already:
   - `git add -A` for a full commit
   - `git add <specific-paths>` if the user named them
4. **Verify the pre-commit sanity** before committing:
   - `pnpm run lint` returns clean
   - `pnpm test` returns green for the touched modules
   - No untracked `.env` files (the pre-tool-use hook should have caught this, but double-check)
5. **Commit** with the assembled message.

## Commit subject format

Follow Conventional Commits 1.0.0:

```
<type>(<scope>): <subject>

<body>

<footers>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

`<scope>` is one of: `auth`, `billing`, `tenancy`, `users`, `memberships`, `health`, `queue`, `mail`, `redis`, `common`, `frontend`, `infra`, `migrations`, `release`.

## Example

```
feat(billing): add idempotency to checkout.session.completed webhook

Insert into webhook_events with unique (event_id) before processing the
event. Concurrent webhooks for the same event.id are coalesced via
INSERT ... ON CONFLICT DO NOTHING.

Ref: README §Roadmap (Webhook idempotency)

TenantKit-Change: backend/billing, backend/migrations
```

## Boundaries

- Never `--amend` a commit unless the user explicitly says so. The pre-tool-use hook will not block `--amend` but it is the right safety net.
- Never `--force` or `--force-with-lease`. The settings.json deny list blocks these.
- Never commit `.env`, `.env.*`, or anything under `secrets/`. The hook will block the edit; double-check before staging.
- Never sign off or add `Co-Authored-By:` trailers from non-human authors unless the user asks.
