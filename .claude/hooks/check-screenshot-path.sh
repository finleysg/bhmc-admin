#!/bin/bash
# Blocks playwright-cli screenshot commands that write outside /tmp

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# Only check playwright-cli screenshot commands
if echo "$COMMAND" | grep -q "screenshot"; then
  # Check for --filename= flag with a path NOT starting with /tmp
  if echo "$COMMAND" | grep -qE -- '--filename=' && ! echo "$COMMAND" | grep -qE -- '--filename=/tmp'; then
    echo "Screenshots must be saved to /tmp/. Use --filename=/tmp/your-file.png" >&2
    exit 2
  fi
  # Check for screenshot commands without --filename (defaults to cwd)
  if ! echo "$COMMAND" | grep -qE -- '--filename='; then
    echo "Screenshots must be saved to /tmp/. Add --filename=/tmp/your-file.png" >&2
    exit 2
  fi
fi

exit 0
