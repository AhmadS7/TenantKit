---
name: frontend-test
description: Run a single Jest test (or full suite) in frontend/ with optional watch mode. Use when iterating on a frontend component or debugging a test failure. Trigger: "run frontend test", "jest frontend", "test this component", "frontend test failing".
---

# /frontend-test

Run Jest in the `frontend/` workspace. Supports filtering by file or test name, plus watch mode.

## When to use

- The user wants to run a specific test
- The user is debugging a frontend test failure
- The user wants to know if the frontend test suite is green

## Procedure

1. **Detect the working directory.** Always run from `frontend/`. If the user's intent is to run a backend test, the user is confused — point them at `pnpm test` from the repo root.
2. **Confirm dependencies are installed.** If `frontend/node_modules/.bin/jest` is missing, run `cd frontend && pnpm install` first.
3. **Decide the command** based on the user's intent:

   | User said | Command |
   |---|---|
   | "run the full frontend suite" | `cd frontend && pnpm test` |
   | "run this test file: <path>" | `cd frontend && pnpm test <path>` |
   | "run a specific test by name" | `cd frontend && pnpm test -- -t "<pattern>"` |
   | "watch this test" | `cd frontend && pnpm test:watch <path>` |
   | "frontend test failing, debug" | `cd frontend && pnpm test <path> --verbose --no-coverage` |
   | "what's the coverage" | `cd frontend && pnpm test -- --coverage` |

4. **Always pass `--runInBand`** for non-watch runs when the test is interactive (debug output is easier to read without parallelization). Jest 30 parallelizes by default; this slows it slightly but improves the signal.

5. **Read the output carefully.** If the test fails, do not just paste the stack trace. Summarize:
   - Which test(s) failed
   - The assertion that failed
   - One-sentence guess at the cause (with a 70% confidence floor; if you cannot reach 70%, say "I don't know yet, here is the relevant output")

6. **Offer the next step.** If the failure is a Next.js 16 API change, point the user at `frontend/AGENTS.md` and `frontend/node_modules/next/dist/docs/`. If it is a component logic issue, suggest a fix or ask whether to apply it.

## Common patterns in this repo

- `frontend/__tests__/<Component>.test.tsx` — colocated component tests
- Mocking axios: `jest.mock('axios')` at the top of the spec
- Mocking TanStack Query: wrap the component in a `QueryClientProvider` with a fresh `QueryClient` per test
- Mocking router (Next.js): `jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))`

## Reference files

- [frontend/jest.config.ts](../../../frontend/jest.config.ts) — Jest config
- [frontend/jest.setup.ts](../../../frontend/jest.setup.ts) — test setup (testing-library/jest-dom)
- [frontend/AGENTS.md](../../../frontend/AGENTS.md) — Next.js 16 doc warning
- [frontend/package.json](../../../frontend/package.json) — `test`, `test:watch` scripts

## Boundaries

- Do not run backend tests from this skill. Use `pnpm test` from the repo root instead.
- Do not modify Jest config to "make the test pass" — fix the test or the code.
- Do not add new test deps (`@testing-library/user-event`, `msw`, etc.) without user approval.
