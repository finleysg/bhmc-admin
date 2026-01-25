CRITICAL: Complete exactly ONE PRD item, make ONE commit, then STOP.

You are running in sandbox mode with the command `docker sandbox run claude`.

1. Pick the highest priority incomplete PRD item (one item = one feature).
   Only if ALL PRD items are already complete, output <promise>COMPLETE</promise>.
2. Read up to the last 10 commit messages to understand what has been done.
3. Understand existing patterns.
4. Plan tests if needed.
5. Run `pnpm install --force` to rebuild native deps for Linux sandbox.
6. Run feedback loops: pnpm typecheck, pnpm lint, pnpm test.
7. Make ONE git commit for this single PRD item:
   - Include the prd file name and task number.
   - Keep your commit message precise: task completed, decisions, files changed, blockers.
8. Update the work item status to true.

STOP HERE. Do not continue to other work items.
