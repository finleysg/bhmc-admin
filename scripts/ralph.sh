#!/usr/bin/env bash
# ralph.sh - courtesy of Matt Pocock: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Usage: ./ralph.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# For each iteration, run Claude Code with the following prompt.
# This prompt is basic, we'll expand it later.
for ((i=1; i<=$1; i++)); do
  echo "Iteration $i"
  echo "============================================================="
  result=$(docker sandbox run claude -p "@replace-player.json @progress.txt \
1. Find the highest priority feature to work on from the plan file and work ONLY on that feature. \
This should be the one YOU decide has the highest priority, not necessarily the first in the list. \
2. Decide if you need one or more tests for your feature and write the tests as needed. \
3. Check your feedback loops: pnpm typecheck, pnpm lint, pnpm test. \
4. Make a git commit of that feature. \
ONLY WORK ON A SINGLE FEATURE. \
5. After completing each task, append to progress.txt: \
- Task completed and PRD item reference \
- Key decisions made and reasoning \
- Files changed \
- Any blockers or notes for next iteration \
Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration. \
If, while implementing the feature, you notice that all work \
is complete, output <promise>COMPLETE</promise>. \
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
