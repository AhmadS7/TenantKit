---
paths:
  - "frontend/src/**/*.{ts,tsx}"
---

# Frontend — Next.js 16 Rules

Applies to every file under `frontend/src/`.

> **MANDATORY** — read [frontend/AGENTS.md](../../frontend/AGENTS.md) before writing or reviewing any frontend code. "This is NOT the Next.js you know" — APIs and conventions may differ from training data. Check `frontend/node_modules/next/dist/docs/` for the current truth.

## App Router

- `'use client'` at the top of every file that uses hooks, browser-only APIs, or state
- No Server Actions (project rule)
- No legacy data-fetching helpers (the App Router model does not use them)
- Page components under `frontend/src/app/` default to client-rendered; if you must server-render, justify it

## Data fetching

- All server data via TanStack Query (`@tanstack/react-query`)
- No `useEffect` + raw fetch for data — that is a TanStack Query `useQuery` job
- Query keys centralized (search `queryKeys`); no inline `['users', id]` literals
- Mutations use `useMutation` and invalidate the relevant query keys

## Auth + tenant context

- Tokens **never** in `localStorage` or `sessionStorage`. Use httpOnly cookie (if SSR) or in-memory Zustand store with refresh
- The axios interceptor handles 401 → refresh → retry. Do not duplicate that logic
- Tenant context comes from the rewrite (`/_tenants/[tenant]`) or `X-Tenant` header, not from URL parsing in components

## Rendering safety

- Unescaped HTML injection: never. If you must render user HTML, pipe it through DOMPurify (already a dependency)
- No dynamic code evaluation from user-supplied strings
- User-supplied strings go through React's default escaping

## Styling

- Tailwind 4 utility classes; no inline `style={{...}}` for theming
- No CSS modules unless the existing file already uses them
- No `@apply` outside `frontend/src/app/globals.css`

## Forms

- `react-hook-form` + `@hookform/resolvers/zod` for any new form
- Zod schema colocated with the form; export if reused

## Icons

- `lucide-react` first, `@fortawesome/react-fontawesome` second
- Never import from `react-icons` (not a project dep)

## Tests

- `frontend/__tests__/<Component>.test.tsx` — sibling to source
- `@testing-library/react` for rendering
- Mock axios + TanStack Query client
- `jest.mock('next/navigation', ...)` for router

## Reference

- [frontend/AGENTS.md](../../frontend/AGENTS.md)
- [frontend/next.config.ts](../../frontend/next.config.ts)
- [frontend/src/](../../frontend/src/)
- [`nextjs-reviewer`](../agents/nextjs-reviewer.md) subagent
- [`/frontend-test`](../skills/frontend-test/SKILL.md) skill
