---
description: Git commit policy for this workspace
alwaysApply: true
applyTo: "**"
---

# Git Commit Policy

**NEVER commit changes outside of the `/commit-task.md` workflow.**

All commits must go through the comprehensive `/commit-task.md` workflow which includes:

- Code quality checks (formatting, linting, build, testing)
- Proper changelog updates
- Conventional commit message generation
- User approval for each step

Manual `git add` and `git commit` commands are **discouraged** and should only be used in exceptional cases with explicit user approval.

## Rationale

- Prevents accidental commits of incomplete or untested changes
- Ensures consistent code quality standards are maintained
- Maintains detailed changelog and documentation
- Provides comprehensive quality gates before commits
- Ensures user has final approval over each step of the process

## Workflow

1. Make code changes as requested
2. Run `/commit-task.md` to initiate the complete deployment workflow
3. Follow the workflow until completion or user decline
4. Commits will be made as part of step 7 of the workflow with explicit user approval

## Exceptions

- Emergency hotfixes may bypass some checks with explicit user approval
- Manual commits must include justification for bypassing the workflow

This rule always applies to maintain code quality and documentation standards.
