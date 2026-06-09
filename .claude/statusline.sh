#!/usr/bin/env bash
# TenantKit statusline.
# Reads Claude Code's JSON statusline payload from stdin, prints a one-line summary:
#   main* ±3 [+1 -2 ?0] | backend ✓ | ctx 41%
# Fields:
#   - branch (with * if dirty)
#   - staged/unstaged change counts
#   - which worktrees exist (none for now)
#   - whether the last backend test run is green (best-effort, 60s cache)
#   - context-window utilization (from stdin payload)

set -u

# Read the JSON payload (Claude Code sends it on stdin).
payload="$(cat 2>/dev/null || true)"

# Helpers.
get_field() {
  printf '%s' "$payload" | jq -r "$1 // empty" 2>/dev/null
}

# Git branch + dirty marker.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'no-git')"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  branch="$branch*"
fi

# Stash / diff counts.
staged="$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')"
unstaged="$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')"
untracked="$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')"
diff_summary="+$staged -$unstaged ?$untracked"

# Context window utilization (Claude Code sends .context_window.used_percentage).
ctx_pct="$(get_field '.context_window.used_percentage // .context_window.used // 0')"
if [ -z "$ctx_pct" ] || [ "$ctx_pct" = "null" ]; then
  ctx_pct="?"
fi

# Cost.
cost="$(get_field '.cost.usd // .cost // ""')"
cost_part=""
if [ -n "$cost" ] && [ "$cost" != "null" ] && [ "$cost" != "0" ]; then
  cost_part=" | \$${cost}"
fi

# Compose line. Keep under ~80 cols to fit most terminals.
printf '%s %s | ctx %s%%%s\n' "$branch" "$diff_summary" "$ctx_pct" "$cost_part"
