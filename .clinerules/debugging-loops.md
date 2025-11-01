# Debugging Loops

Purpose: Prevent infinite retry loops when something consistently fails, ensuring efficient
debugging and user experience.

## Recognition Criteria

When a tool use fails repeatedly with the same approach:

- Same tool used 3+ times with minimal variation
- Same error/result each time
- No new information between attempts

## Required Actions

1. **Stop after 3 failed attempts** with the same approach
2. **Ask the user** for guidance rather than retry
3. **Try a different approach** (e.g., write_to_file instead of replace_in_file)
4. **Check for external factors** (auto-formatters, linters, file locks)

## Examples

- ✗ Attempting same replace_in_file 10 times
- ✓ After 3 fails, switch to write_to_file or ask user
- ✓ After 3 fails, ask if there's a formatter issue

## Rationale

- Prevents wasting time and context window on futile attempts
- Forces consideration of alternative approaches
- Improves user experience by seeking guidance when stuck
- Encourages systematic debugging rather than brute force

## Auto-Formatter Conflicts

Purpose: Provide concrete steps for detecting and resolving conflicts caused by automatic formatters (Prettier, editor format-on-save) that revert or modify edits.

Recognition

- A replace/write operation appears to succeed but the file reverts to a different form after formatting.
- The same SEARCH/REPLACE pattern fails repeatedly even though the tool reports success.
- Linter/formatter runs immediately after save and changes the file back.

Required Actions

1. Stop retrying the same exact edit after 2 failed attempts that appear to be caused by a formatter.
2. Diagnose the conflict:
   - Re-open the file and compare the attempted change vs. the actual file content.
   - Check project formatter settings (Prettier, editorformat-on-save) and ESLint rules that may conflict.
3. Choose a resolution strategy (one of):
   - Add a targeted suppression near the affected lines (e.g., `/* eslint-disable import/order */` or `// prettier-ignore`) with a one-line justification comment.
   - Modify the code so it satisfies both the formatter and linter.
   - Ask the user to confirm a change to formatter/linter configuration if it seems workspace-wide.
4. If adding a suppression, include a one-line comment explaining why it is necessary and reference an issue or guideline if available.
5. Never attempt the same exact replacement more than 3 times. If still failing, ask the user for guidance.

Example workflow

- Attempt 1: replace_in_file → Auto-formatter reverts
- Attempt 2: replace_in_file → Auto-formatter reverts  
  ✓ STOP: Diagnose and choose a different approach (add suppression, change code, or ask user)
  ✗ DON'T: Keep retrying the same replacement multiple times

Rationale

- Reduces wasted work and context use
- Encourages explicit handling of formatter/linter conflicts
- Makes the bot's behavior predictable and easier for maintainers to reason about
