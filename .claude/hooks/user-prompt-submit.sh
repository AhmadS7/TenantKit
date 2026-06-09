#!/usr/bin/env bash
# TenantKit user-prompt-submit hook.
# Inspects the user's prompt for destructive intent and injects a reminder as stderr.
# Claude Code surfaces stderr on UserPromptSubmit as additional context, so the model
# gets a "be careful" nudge without changing the user's prompt.

# shellcheck source=lib/common.sh
. "$(dirname "$0")/lib/common.sh"

read_stdin payload
[ -z "$payload" ] && ok

# user_prompt is sometimes under .user_prompt, sometimes .prompt — accept both.
prompt="$(json_field "$payload" '.user_prompt // .prompt // ""')"
[ -z "$prompt" ] && ok

lower_prompt="$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')"

dangerous=0
case "$lower_prompt" in
  *"--confirmed"*) dangerous=0 ;;  # explicit override
  *"drop table"*|*"drop database"*|*"truncate"*) dangerous=1 ;;
  *"wipe the db"*|*"nuke the database"*|*"destroy prod"*) dangerous=1 ;;
  *"force push"*|*"push -f"*|*"--force"*) dangerous=1 ;;
  *"rm -rf"*) dangerous=1 ;;
  *"git reset --hard"*) dangerous=1 ;;
  *"terraform destroy"*) dangerous=1 ;;
esac

if [ "$dangerous" -eq 1 ]; then
  warn "Destructive intent detected. Confirm the exact target (table, env, branch) with the user before proceeding. If you have already confirmed, append the literal token --confirmed to the next bash command to bypass this reminder for this turn."
fi

ok
