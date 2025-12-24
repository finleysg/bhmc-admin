---
description: Format, lint, test, build, then commit changes
---

# Commit Workflow

Execute these steps in order. Fix any issues before proceeding to the next step.

## Step 1: Format

Run `pnpm format` to format code.

## Step 2: Lint

Run `pnpm lint`. If there are errors:

1. Attempt to fix them (prefer `pnpm lint:fix` first)
2. For remaining issues, edit files directly
3. Re-run lint to verify fixes

## Step 3: Test

Run `pnpm test`. If tests fail:

1. Analyze failures
2. Fix the issues (only fix tests you broke, not pre-existing failures)
3. Re-run tests to verify

## Step 4: Build

Run `pnpm build`. If build fails:

1. Fix type errors or build issues
2. Re-run build to verify

## Step 5: Branch Check

Check current branch with `git branch --show-current`. If on `main`:

1. Ask user for a branch name
2. Create and checkout the new branch: `git checkout -b <branch-name>`

## Step 6: Stage Changes

Run `git add -A` to stage all changes.

## Step 7: Commit

1. Run `git diff --cached --stat` to summarize staged changes
2. Create a concise commit message describing the changes
3. Commit using:

```bash
git commit -m "$(cat <<'EOF'
<commit message>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Step 8: Push (User Decision)

Ask the user: "Push branch to remote?"

- If yes: `git push -u origin <branch-name>`
- If no: skip

## Step 9: PR (User Decision)

Ask the user: "Open a pull request?"

- If yes: Create PR using `gh pr create` with a summary of changes
- If no: done
