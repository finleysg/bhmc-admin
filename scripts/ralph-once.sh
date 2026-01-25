#!/usr/bin/env bash
set -e

claude --model opus --permission-mode acceptEdits "@plans/club-documents-prd.json \
CRITICAL: Complete exactly ONE PRD item, make ONE commit, then STOP. \
1. Pick the highest priority incomplete PRD item (one item = one feature). \
   Only if ALL PRD items are already complete, output <promise>COMPLETE</promise>. \
2. Read up to the last 10 commit messages to understand what has been done. \
3. Analyse existing patterns. \
4. Plan tests if needed. \
5. Run feedback loops: pnpm typecheck, pnpm lint, pnpm test. \
6. Make ONE git commit for this single PRD item. Keep your commit message precise: task completed, PRD ref, decisions, files changed, blockers. \
7. Update the work item status to true. \
8. STOP HERE. Do not continue to other work items. \
If, while implementing the feature, you notice that all work \
is complete, output <promise>COMPLETE</promise>. \
"
