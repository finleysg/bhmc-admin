---
description: Stage changes if needed, push a branch, and open a PR if needed
---

# Commit Workflow

Execute these steps in order. Fix any issues before proceeding to the next step.

## Step 1: Branch Check

Check current branch with `git branch --show-current`. If on `main`:

1. Ask user for a branch name
2. Create and checkout the new branch: `git checkout -b <branch-name>`

## Step 2: Stage Changes

Run `git add -A` to stage all changes.

## Step 3: Commit

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

## Step 4: Push

Push branch to remote: `git push -u origin <branch-name>`

## Step 9: PR

If there is not already an open PR create one using `gh pr create` with a summary of changes
