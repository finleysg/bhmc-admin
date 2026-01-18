#!/usr/bin/env bash
set -e

claude --model sonnet --permission-mode acceptEdits "@plans/replace-player-prd.json @progress.txt \
1. Find the highest priority feature to work on from the plan file and work ONLY on that feature. \
This should be the one YOU decide has the highest priority, not necessarily the first in the list. \
2. Decide if you need one or more tests for your feature and write the tests as needed. \
3. Check your feedback loops: pnpm typecheck, pnpm lint, pnpm test. \
4. Make a git commit of that feature. \
ONLY WORK ON A SINGLE FEATURE. \
5. After completing each task, update the status if the PRD task to true, then append to progress.txt: \
- Task completed and PRD item reference \
- Key decisions made and reasoning \
- Files changed \
- Any blockers or notes for next iteration \
Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration. \
If, while implementing the feature, you notice that all work \
is complete, output <promise>COMPLETE</promise>. \
"
