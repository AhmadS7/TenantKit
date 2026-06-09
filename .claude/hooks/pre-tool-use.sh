#!/usr/bin/env bash
# TenantKit pre-tool-use hook.
# Reads the JSON payload from stdin (Claude Code contract), enforces:
#   1. Secret writes blocked (Write|Edit|MultiEdit on .env* or **/secrets/**)
#   2. Migration edits warned if file already committed
#   3. Destructive SQL requires explicit confirmation
# Exits 0 to allow, 2 to block (stderr carries the reason).

# shellcheck source=lib/common.sh
. "$(dirname "$0")/lib/common.sh"

read_stdin payload
[ -z "$payload" ] && ok

tool_name="$(json_field "$payload" '.tool_name')"
log "pre-tool-use tool=$tool_name"

# --- Rule 1: secret writes -----------------------------------------------
if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ] || [ "$tool_name" = "MultiEdit" ]; then
  # Extract target path. Write/Edit use tool_input.file_path; MultiEdit nests per edit but
  # also has tool_input.file_path at top level.
  file_path="$(json_field "$payload" '.tool_input.file_path // ""')"
  if [ -z "$file_path" ]; then
    file_path="$(json_field "$payload" '.tool_input.path // ""')"
  fi

  case "$file_path" in
    .env|.env.*|*/.env|*/.env.*)
      block "Refusing to write to $file_path — secret files must be edited by the user, not by Claude. Use .env.example for documentation." ;;
    */secrets/*|secrets/*)
      block "Refusing to write to $file_path — secrets directory is write-protected by the pre-tool-use hook." ;;
  esac

  # --- Rule 2: committed migrations are immutable -------------------------
  case "$file_path" in
    src/migrations/*)
      if file_is_tracked "$file_path"; then
        warn "Editing already-committed migration $file_path — migrations are forward-only. Author a new migration instead."
        # Not a hard block, but the warning surfaces in Claude's context.
      fi
      ;;
  esac
fi

# --- Rule 3: destructive SQL requires explicit confirmation ---------------
if [ "$tool_name" = "Bash" ]; then
  command="$(json_field "$payload" '.tool_input.command // ""')"
  if printf '%s' "$command" | grep -Eqi '\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b'; then
    if printf '%s' "$command" | grep -q -- '--confirmed'; then
      log "destructive SQL with --confirmed flag, allowing"
    else
      block "Destructive SQL detected. Add the literal flag --confirmed to the command to proceed. Example: pnpm exec typeorm query \"DROP TABLE x --confirmed\""
    fi
  fi
fi

ok
