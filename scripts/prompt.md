CRITICAL: Complete exactly ONE PRD item, make ONE commit, then STOP.

1. Pick the highest priority incomplete PRD item (one item = one feature).
   Only if ALL PRD items are already complete, output <promise>COMPLETE</promise>.
2. Read up to the last 10 commit messages to understand what has been done.
3. Understand existing patterns.
4. Implement the feature using the tdd skill (red/green development pattern).
5. Refactor until the test or tests are GREEN.
6. Run feedback loops: pnpm typecheck, pnpm lint, pnpm test.
7. Make ONE git commit for this single PRD item:
   - Include the prd file name and task number.
   - Keep your commit message precise: task completed, decisions, files changed, blockers.
8. Update the work item status to true.

STOP HERE. Do not continue to other work items.
