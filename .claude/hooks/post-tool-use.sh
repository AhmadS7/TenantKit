#!/usr/bin/env bash
# TenantKit post-tool-use hook.
# Auto-runs prettier + eslint --fix on every .ts / .tsx edit.
# Swallows errors so a failed formatter never blocks the underlying edit.

# shellcheck source=lib/common.sh
. "$(dirname "$0")/lib/common.sh"

read_stdin payload
[ -z "$payload" ] && ok

tool_name="$(json_field "$payload" '.tool_name')"
case "$tool_name" in
  Write|Edit|MultiEdit) ;;
  *) ok ;;
esac

file_path="$(json_field "$payload" '.tool_input.file_path // .tool_input.path // ""')"
[ -z "$file_path" ] && ok

# Only run on TypeScript files. Skip .d.ts, .spec.ts in test runs, and node_modules.
case "$file_path" in
  *.ts|*.tsx) ;;
  *) ok ;;
esac
case "$file_path" in
  */node_modules/*|*/dist/*|*/.next/*) ok ;;
esac

cd "$TK_REPO_ROOT" || ok

# Resolve working directory for the formatter.
workdir="$TK_REPO_ROOT"
if is_in_frontend "$file_path"; then
  workdir="$TK_REPO_ROOT/$TK_FRONTEND_DIR"
fi

# Make path absolute if relative.
case "$file_path" in
  /*) abs_path="$file_path" ;;
  *)  abs_path="$TK_REPO_ROOT/$file_path" ;;
esac

# Only run if the file actually exists (multi-edit may touch files we haven't created yet on first pass).
[ -f "$abs_path" ] || ok

log "post-tool-use: formatting $abs_path (cwd=$workdir)"

# Run prettier then eslint --fix. Both are best-effort; pipefail OFF so a failure in one
# doesn't mask the other, and errors never exit non-zero (this hook must never fail the edit).
(
  cd "$workdir" || exit 0
  pnpm exec prettier --write "$abs_path" >/dev/null 2>&1 || true
  pnpm exec eslint --fix "$abs_path" >/dev/null 2>&1 || true
) &

# Don't wait for the background job. Detach so a slow pnpm never blocks the chat loop.
disown 2>/dev/null || true

ok
