---
name: env-check
description: Verify the user's .env file against .env.example and warn about missing required keys. Use before a production deploy, after pulling new env-related code, or whenever the user asks "do I have all the env vars?". Trigger: "check env", "missing env vars", ".env", "what env do I need".
---

# /env-check

Diff `.env` (if present) against `.env.example` and the Joi schema in [src/config/env.validation.ts](../../../src/config/env.validation.ts).

## When to use

- The user just pulled new code that adds an env var
- The user is about to deploy
- The user is debugging "service won't start, says X is undefined"
- The user asks "what env vars do I need?"

## Procedure

1. **Read `.env.example`** at the repo root. This is the human-readable doc of every env var the app might use.
2. **Read `.env`** if it exists. Do NOT print its contents (the pre-tool-use hook has blocked reading `.env` — work from `git diff .env` or from a key-only sanitized view if you have to). **Do not** echo values. If you need to confirm a value, ask the user.
3. **Read [src/config/env.validation.ts](../../../src/config/env.validation.ts)** for the canonical Joi schema. Required keys are those with `.required()`.
4. **For each required key in the Joi schema:**
   - If `.env` is missing it → `blocker`
   - If `.env` has the key but it equals the placeholder (e.g. `change_me`, `postgres`, `replace_me`) → `warning` for any key that is a real secret in production
5. **For each key in `.env.example` that is optional:**
   - Note it in a "recommended" list (e.g. `RLS_ENABLED`, `STRIPE_PRO_PRICE_ID`)
6. **For each key in `.env` that is NOT in `.env.example`:**
   - Flag as `nit` (probably stale; either delete or document in `.env.example`)
7. **Mode-specific checks** (based on `NODE_ENV`):
   - `production`:
     - `JWT_SECRET` must not be `change_me` (blocker)
     - `DB_PASSWORD` must not be `postgres` or empty (blocker)
     - `STRIPE_WEBHOOK_SECRET` must be set (blocker if Stripe is the active mode, i.e. `STRIPE_API_KEY !== 'change_me'`)
     - `RLS_ENABLED=true` is required (blocker) — see [src/app.module.ts:44](../../../src/app.module.ts) and ADR-001
   - `development`:
     - `RLS_ENABLED` may be `false` (default)
   - `test`:
     - The `ThrottlerModule` is `skipIf: () => isTest` (see [src/app.module.ts:62](../../../src/app.module.ts)), so Redis is optional in test

## Output format

```
## env-check

### blockers
- JWT_SECRET is unset or 'change_me' in production — rotating now will rotate every active session

### warnings
- STRIPE_PRO_PRICE_ID is unset — Pro plan checkout will fail

### nits
- DEBUG_PORT in .env is not in .env.example — document or remove

### required keys (NODE_ENV=production)
- [✓] NODE_ENV
- [✓] PORT
- [✓] DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- [✓] REDIS_HOST, REDIS_PORT
- [✓] JWT_SECRET
- [✗] STRIPE_WEBHOOK_SECRET
- [✓] RLS_ENABLED
```

## Reference files

- [.env.example](../../../.env.example) — human-readable env doc
- [src/config/env.validation.ts](../../../src/config/env.validation.ts) — Joi schema, canonical truth
- [src/app.module.ts](../../../src/app.module.ts) — env reads via `ConfigService.getOrThrow`
- [docs/adr/0001-multi-tenant-architecture.md](../../../docs/adr/0001-multi-tenant-architecture.md) — RLS requirement rationale

## Boundaries

- Never print env values. Keys only.
- Never edit `.env` or `.env.example`. Surface the issue; the user fixes.
- Never assume `NODE_ENV`; if it is unset, treat as `development` and warn.
