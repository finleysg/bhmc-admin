#!/usr/bin/env bash
set -e

claude --model sonnet --permission-mode acceptEdits "@plans/phase-4.6-prd.json \
CRITICAL: Complete exactly ONE PRD item, make ONE commit, then STOP. \
If, while implementing the feature, you notice that all work is complete, output <promise>COMPLETE</promise>. \
1. Pick the highest priority incomplete PRD item (one item = one feature). \
   Only if ALL PRD items are already complete, output <promise>COMPLETE</promise>. \
2. Read up to the last 10 commit messages to understand what has been done. \
3. Analyse existing patterns. \
4. Implement the feature using the tdd skill (red/green development pattern). \
5. Refactor until the test or tests are GREEN. \
6. Make ONE git commit for this single PRD item. Keep your commit message precise: task completed, PRD ref, decisions, files changed, blockers. \
7. Update the work item status to true. \
8. STOP HERE. Do not continue to other work items. \
"
