#!/usr/bin/env bash
# Shared helpers for TenantKit .claude/hooks/*.sh
# Sourced by every hook. Pure POSIX-ish bash + git + pnpm + jq.

set -u

# Resolve repo root regardless of where the hook is invoked from.
TK_REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export TK_REPO_ROOT
export TK_FRONTEND_DIR="${TENANTKIT_FRONTEND_DIR:-frontend}"
export TK_LOG_FILE="${TK_REPO_ROOT}/.claude/hooks/.log"

# log "msg" — append a timestamped line to the hook log. Never blocks the hook.
log() {
  printf '[%s] [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${0##*/}" "$*" >> "$TK_LOG_FILE" 2>/dev/null || true
}

# read_stdin — read all of stdin into a variable (used for JSON payloads from Claude).
read_stdin() {
  local buf=""
  if [ -t 0 ]; then
    eval "$1=''"
    return 0
  fi
  buf="$(cat 2>/dev/null || true)"
  eval "$1=\$buf"
}

# json_field <json> <jq-filter> — pull a field out of a JSON payload. Returns empty if jq missing/fails.
json_field() {
  local json="$1" filter="$2"
  command -v jq >/dev/null 2>&1 || { echo ""; return 0; }
  printf '%s' "$json" | jq -r "$filter // empty" 2>/dev/null
}

# block <reason> — print a JSON decision to stdout and exit 2.
# Per Claude Code hook contract, exit 2 with stderr message = "block decision".
block() {
  local reason="$1"
  log "BLOCK: $reason"
  # Output to stderr (captured by Claude Code as the block reason).
  printf '%s\n' "$reason" >&2
  exit 2
}

# warn <reason> — log only, do not block. Exit 0.
warn() {
  log "WARN: $1"
  printf '%s\n' "$1" >&2
  return 0
}

# ok — pass-through exit.
ok() {
  exit 0
}

# is_in_frontend <path> — true if path is under $TK_FRONTEND_DIR.
is_in_frontend() {
  case "$1" in
    "${TK_FRONTEND_DIR}/"*|"${TK_FRONTEND_DIR}") return 0 ;;
    *) return 1 ;;
  esac
}

# file_is_tracked <path> — true if path is tracked by git in HEAD.
file_is_tracked() {
  git -C "$TK_REPO_ROOT" ls-files --error-unmatch -- "$1" >/dev/null 2>&1
}
