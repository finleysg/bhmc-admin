#!/bin/bash
# Blocks playwright-cli artifacts from being written outside /tmp.
# Covers: screenshots (--filename flag) and any Bash commands that would
# create common Playwright artifact files (.yml, .json trace, .webm, .zip)
# in the project directory.

INPUT=$(cat /dev/stdin)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

if [ "$TOOL" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

  # Block playwright-cli screenshot commands that write outside /tmp
  if echo "$COMMAND" | grep -q "screenshot"; then
    if echo "$COMMAND" | grep -qE -- '--filename=' && ! echo "$COMMAND" | grep -qE -- '--filename=/tmp'; then
      echo "Screenshots must be saved to /tmp/. Use --filename=/tmp/your-file.png" >&2
      exit 2
    fi
    if ! echo "$COMMAND" | grep -qE -- '--filename='; then
      echo "Screenshots must be saved to /tmp/. Add --filename=/tmp/your-file.png" >&2
      exit 2
    fi
  fi

  # Block playwright-cli trace/video/snapshot exports outside /tmp
  if echo "$COMMAND" | grep -q "playwright-cli"; then
    if echo "$COMMAND" | grep -qE -- '--output=' && ! echo "$COMMAND" | grep -qE -- '--output=/tmp'; then
      echo "Playwright artifacts must be saved to /tmp/." >&2
      exit 2
    fi
  fi
fi

if [ "$TOOL" = "Write" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

  # Block writing Playwright artifact files (.yml/.yaml) into the project root.
  # Allows .yml in subdirectories (e.g. .github/workflows/, .claude/) since those are config.
  if echo "$FILE_PATH" | grep -qE '\.(yml|yaml)$' && ! echo "$FILE_PATH" | grep -qE '^/tmp/'; then
    DIR=$(dirname "$FILE_PATH")
    PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
    if [ -n "$PROJECT_DIR" ] && [ "$DIR" = "$PROJECT_DIR" ]; then
      BASENAME=$(basename "$FILE_PATH")
      # Allow known root config files
      case "$BASENAME" in
        docker-compose.yml|compose.yml|compose.yaml) ;;
        *)
          echo "Playwright .yml artifacts must be saved to /tmp/, not the project root." >&2
          exit 2
          ;;
      esac
    fi
  fi

  # Block trace files, videos, and other Playwright artifacts
  if echo "$FILE_PATH" | grep -qE '\.(webm|zip|har)$' && ! echo "$FILE_PATH" | grep -qE '^/tmp/'; then
    echo "Playwright artifacts (.webm, .zip, .har) must be saved to /tmp/." >&2
    exit 2
  fi
fi

exit 0
