#!/usr/bin/env bash
# TenantKit stop hook.
# On Claude's response ending, if there are uncommitted changes, append a reminder to stderr
# so the next turn starts with the user thinking about whether to commit / stash / discard.

# shellcheck source=lib/common.sh
. "$(dirname "$0")/lib/common.sh"

cd "$TK_REPO_ROOT" || ok

if ! command -v git >/dev/null 2>&1; then
  ok
fi

# Quick path: porcelain output is empty if tree is clean.
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  ok
fi

untracked_count="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
warn "Session ended with $untracked_count uncommitted change(s) in the working tree. Consider: pnpm run lint && pnpm test (backend) | cd frontend && pnpm test (frontend) | git add -p && /commit."

ok
