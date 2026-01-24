#!/usr/bin/env bash
# ralph.sh - modified from Matt Pocock: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Usage: ./ralph.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# Temp file for capturing output while streaming
tmpfile=$(mktemp)
trap "rm -f $tmpfile" EXIT

# For each iteration, run Claude Code with the following prompt.
# This prompt is basic, we'll expand it later.
for ((i=1; i<=$1; i++)); do
  echo "Iteration $i"
  echo "============================================================="
  docker sandbox run claude -p --model sonnet "@plans/member-pages-phase-4.json @progress.txt \
CRITICAL: Complete exactly ONE PRD item, make ONE commit, then STOP. \
1. Pick the highest priority incomplete PRD item (one item = one feature). \
2. If you are creating screens or components, analyse existing patterns. \
3. Write tests if needed. \
4. Run feedback loops: pnpm typecheck, pnpm lint, pnpm test. \
5. Make ONE git commit for this single PRD item. \
6. Update the work item status to true. Append to progress.txt: task completed, PRD ref, decisions, files changed, blockers. Keep concise. \
7. STOP HERE. Do not continue to other work items. \
Only if ALL PRD items are already complete, output <promise>COMPLETE</promise>. \
" 2>&1 | tee "$tmpfile"

  if grep -q "<promise>COMPLETE</promise>" "$tmpfile"; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
