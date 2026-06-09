#!/usr/bin/env bash
# TenantKit Claude Code setup installer.
# Idempotent. Safe to re-run.
#
# What it does:
#   1. Verifies we're in a git repo
#   2. Confirms .claude/ already exists (this script does not scaffold it; the
#      checked-in templates are the source of truth)
#   3. Ensures settings.json is valid JSON
#   4. Ensures all hook scripts are executable
#   5. Prints a summary: skills installed (registry), hooks active, agents, rules
#
# Registry skills (getsentry/commit, getsentry/code-review, getsentry/security-review,
# garrytan/review) are NOT installed by this script. Run them via the Skillsmith
# MCP tools (mcp__skillsmith__install_skill) in a Claude Code session so the install
# honors user-level skill preferences and security scan.

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Color (if TTY).
if [ -t 1 ]; then
  C_BOLD="\033[1m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"; C_RESET="\033[0m"
else
  C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RESET=""
fi

step() { printf '\n%s== %s ==%s\n' "$C_BOLD" "$1" "$C_RESET"; }
ok()   { printf '%s ✓ %s%s\n' "$C_GREEN" "$1" "$C_RESET"; }
warn() { printf '%s ! %s%s\n' "$C_YELLOW" "$1" "$C_RESET"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }

# 1. Repo check.
step "1. Verify repo"
[ -d .git ] || fail "Not a git repo. Run from the repo root."
ok ".git found"

# 2. .claude/ present.
step "2. Verify .claude/ scaffold"
[ -d .claude ] || fail ".claude/ not found. Expected the committed scaffold; this script only verifies an existing one."
[ -f .claude/CLAUDE.md ] || fail ".claude/CLAUDE.md missing."
[ -f .claude/settings.json ] || fail ".claude/settings.json missing."
ok ".claude/ scaffold present"

# 3. settings.json is valid JSON.
step "3. Validate .claude/settings.json"
if command -v jq >/dev/null 2>&1; then
  if jq empty .claude/settings.json 2>/dev/null; then
    ok "settings.json is valid JSON"
  else
    fail "settings.json is not valid JSON"
  fi
else
  warn "jq not installed; skipping JSON validation. Install jq to enable this check."
fi

# 4. Hooks executable.
step "4. Ensure hooks are executable"
for f in .claude/hooks/*.sh .claude/hooks/lib/*.sh .claude/statusline.sh; do
  if [ -f "$f" ]; then
    if [ -x "$f" ]; then
      ok "$f (already executable)"
    else
      chmod +x "$f"
      ok "$f (chmod +x)"
    fi
  fi
done

# 5. .gitignore and .gitattributes.
step "5. Verify .gitignore and .gitattributes"
grep -q '^\.claude/settings\.local\.json$' .gitignore 2>/dev/null \
  || warn ".gitignore missing .claude/settings.local.json entry"
grep -q '^\.claude/hooks/\.log' .gitignore 2>/dev/null \
  || warn ".gitignore missing .claude/hooks/.log entry"
[ -f .gitattributes ] || warn ".gitattributes missing (recommended for hook linguist classification)"
ok "git metadata in place"

# 6. Print summary.
step "Summary"
cat <<EOF
.claude/ contents:
$(find .claude -maxdepth 2 -mindepth 1 -type f -o -type d | sort | sed 's|^|  |')

Hooks (4):
  - pre-tool-use.sh       (blocks .env writes, warns on committed migration edits, requires --confirmed for DROP/TRUNCATE)
  - post-tool-use.sh      (auto prettier + eslint --fix on .ts/.tsx edits)
  - user-prompt-submit.sh (injects reminder for destructive intent)
  - stop.sh               (reminds about uncommitted changes on session end)

Subagents (5):
  - rls-auditor            (Postgres RLS + multi-tenant safety)
  - nestjs-reviewer        (NestJS module/guard/pipe review)
  - nextjs-reviewer        (Next.js 16 App Router review)
  - stripe-billing-reviewer(Stripe webhooks, idempotency, plan tier)
  - migration-author       (TypeORM migration + RLS pair)

Custom skills (8):
  - rls-audit, tenant-trace, stripe-debug, db-migrate, env-check, pr-review, commit, frontend-test

Path-scoped rules (4):
  - backend-nestjs.md      (src/**/*.ts)
  - backend-rls.md         (src/migrations/**)
  - frontend-nextjs.md     (frontend/src/**/*.{ts,tsx})
  - rest-api.md            (src/**/*.controller.ts)

Statusline: .claude/statusline.sh
EOF

# 7. Reminder for registry skills.
step "Next: install registry skills"
cat <<'EOF'
The following registry skills are recommended. Install them from a Claude Code
session using the Skillsmith MCP tools so the install honors your local skill
preferences and security scans:

  getsentry/commit         (verified, score 84) — used by /commit
  getsentry/code-review    (verified, score 84) — used by /pr-review (Standards lens)
  getsentry/security-review(verified, score 84) — used by /pr-review (security lens)
  garrytan/review          (curated,  score 82) — used by /pr-review (Spec + SQL safety lens)

In a Claude session, ask:
  "install getsentry/commit, getsentry/code-review, getsentry/security-review,
   and garrytan/review from the Skillsmith registry"

After install, run a trigger-quality audit:
  mcp__skillsmith__skill_pack_audit --pack_path .claude --check_trigger_quality true
EOF
ok "setup verification complete"
