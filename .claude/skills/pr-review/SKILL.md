---
name: pr-review
description: Run a multi-lens PR review on the current branch: Standards (does the code follow the repo's documented standards?) and Spec (does the code do what the PR description says?), plus TenantKit-specific lenses (RLS, NestJS, Next.js, Stripe). Trigger: "review pr", "review this PR", "review my changes", "review the diff".
---

# /pr-review

Multi-lens review of the current branch / working tree. Spawns parallel sub-agents, then synthesizes.

## When to use

- A PR is open and the user wants a review before merge
- The user has staged or unstaged changes and wants a sanity check
- Before tagging a release

## Procedure

1. **Identify the diff.** Run `git diff main...HEAD` (or `git diff` if no main, or `git diff --staged`). Capture the file list + the diff itself.
2. **Decide the PR description / spec source.** If the user provides a description, use it. Otherwise, infer from the commit messages (`git log main..HEAD --oneline`) and the diff.
3. **Run these lenses in parallel** (each is a sub-agent; spawn them concurrently):

   | Lens | Agent | Focus |
   |---|---|---|
   | Standards | (built-in) | repo's documented coding standards, file naming, error handling |
   | Spec | (built-in) | code matches what the PR description / commit messages claim |
   | RLS | `rls-auditor` | every new/changed entity has migration + RLS pair |
   | NestJS | `nestjs-reviewer` | module wiring, DTOs, env reads, guards |
   | Next.js | `nextjs-reviewer` | App Router, no Server Actions, TanStack Query |
   | Stripe | `stripe-billing-reviewer` | webhook signature, idempotency, plan tier |

4. **De-duplicate findings.** If two lenses flag the same file:line, keep the higher-severity one and note "also flagged by <lens>".
5. **Synthesize the report.**

## Output format

```
## pr-review — <branch> vs <base>
files changed: <N>, +<additions> -<deletions>

### Standards
- [blocker] src/foo.ts:12 — ...
- [warning] src/bar.ts:34 — ...

### Spec
- The PR claims "add bulk export to Pro plan". Found: a new endpoint at /v1/export/bulk guarded by `@RequireFeature('pro.export')`. ✓
- The PR claims "respect tenant RLS". Found: export reads via `this.tenantScopedRepository` which goes through `RlsInterceptor`. ✓

### RLS
- [ok] New table `exports` has paired migration + RLS policy. Index on (tenant_id, created_at) present.

### NestJS
- [warning] src/billing/billing.controller.ts:88 — raw `process.env` read; use ConfigService.getOrThrow

### Next.js
- (no frontend changes in this diff)

### Stripe
- [ok] No billing code touched.

### Summary
| Lens | blocker | warning | nit |
|------|---------|---------|-----|
| Standards | 0 | 1 | 0 |
| Spec | 0 | 0 | 0 |
| RLS | 0 | 0 | 0 |
| NestJS | 0 | 1 | 0 |
| Next.js | — | — | — |
| Stripe | 0 | 0 | 0 |

**Recommendation:** Approve with one warning to address.
```

## Boundaries

- Do not run on a clean tree — there is nothing to review.
- Do not duplicate the Standards lens if the user has explicitly invoked the built-in `/review` skill; merge the findings.
- Do not block on `nit`-level findings. Blockers and warnings only.
- Do not edit any code. The user applies the fixes.
