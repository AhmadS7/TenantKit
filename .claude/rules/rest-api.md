---
paths:
  - "src/**/*.controller.ts"
---

# REST API Standards

Mirrors the global rules in `~/.claude/CLAUDE.md` with project-specific notes.
Applies to every file under `src/**/*controller.ts`.

## Response format

- Always return JSON; set `Content-Type: application/json`
- Never return plain text from API endpoints

## URI design

- Nouns, never verbs
- Plural resource names: `/books`, `/users`
- Prefer flat: `/books?author=foo` over `/authors/foo/books`
- Trailing slashes must not cause 500 errors. Either strip or accept both, but pick one and stay consistent

## Query parameters

Use them for filtering, pagination, sorting, state. Examples: `?page=1&page_size=20`, `?published=true`.

## HTTP semantics

| Method | Status |
|---|---|
| GET | 200 OK |
| POST | 201 Created |
| PUT | 200 OK |
| PATCH | 200 OK |
| DELETE | 204 No Content |
| Async / background | 202 Accepted |

## Error handling

- Never return errors with `200 OK`
- `401 Unauthorized` for invalid/missing auth
- `403 Forbidden` for insufficient permissions
- `422 Unprocessable Entity` for validation errors (preferred over 400 for class-validator failures)
- Errors as structured JSON:
  ```json
  {
    "error": "Invalid payload",
    "detail": {
      "email": "This field is required"
    }
  }
  ```
- The global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` in [src/main.ts](../../src/main.ts) handles most of this. The controller must throw the right exception type for non-validation errors.

## Idempotency

- Non-idempotent POSTs (charges, provisioning) should accept an `Idempotency-Key` header. The key is stored on both the API edge and the worker side (the global rule applies here too).
- Stripe webhook is exempt — Stripe already provides `event.id`, which is the dedupe key (currently a roadmap item, see [README §Roadmap](../../README.md))

## Tenant scoping

- Controllers in the [TenantMiddleware exclude list](../../src/app.module.ts) (auth, billing/webhook, health) are the only ones allowed to skip tenant context
- Every other controller flows through `RlsInterceptor`. No explicit `WHERE tenantId = …` is required; RLS does it. Explicit filters are belt-and-suspenders, not a substitute
