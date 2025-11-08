---
description: Git commit policy for this workspace
alwaysApply: true
applyTo: "**"
---

# Git Commit Policy

**NEVER commit changes unless explicitly asked by the user.**

This rule ensures that all commits are intentional and approved by the user. Changes should be staged and ready, but commits should only happen when the user specifically requests them.

## Rationale

- Prevents accidental commits of incomplete or untested changes
- Ensures user has final approval over what gets committed
- Maintains control over the git history

## Workflow

1. Make code changes as requested
2. Stage changes with `git add` when appropriate
3. **Wait for explicit user instruction** before committing
4. Only commit when user says something like "commit the changes" or "please commit"

## Exceptions

None. This rule always applies.
