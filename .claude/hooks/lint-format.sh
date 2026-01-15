#!/bin/bash
# Read JSON from stdin
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[[ -z "$FILE" || ! -f "$FILE" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx)
    npx eslint --fix "$FILE" 2>&1
    npx prettier --write "$FILE" 2>&1
    ;;
  *.py)
    uv run --directory backend ruff check --fix "$FILE" 2>&1
    uv run --directory backend ruff format "$FILE" 2>&1
    ;;
esac
exit 0
