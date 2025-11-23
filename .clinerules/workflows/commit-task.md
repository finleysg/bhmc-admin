---
description: Git commit workflow for the BHMC Admin project
author: Stuart Finley
version: "1.0"
tags: ["git", "commit", "deploy", "quality"]
globs: ["*.*"]
---

This is a manual workflow. Invoke with `/commit-task.md`. The goal is to run quality checks, commit changes with proper documentation, and handle safe deployment.

<detailed_sequence_of_steps>

# Deployment Workflow — Detailed Sequence of Steps

## 1) Code Formatting

Run formatting to ensure consistent code style:

```xml
<execute_command>
<command>pnpm format</command>
<requires_approval>false</requires_approval>
</execute_command>
```

## 2) Linting Check

Run linting to identify code quality issues. Stop if issues are reported:

```xml
<execute_command>
<command>pnpm lint</command>
<requires_approval>false</requires_approval>
</execute_command>
```

If linting reports issues, fix them before proceeding. This will naturally stop Cline if the command fails non-zero.

## 3) Build Check

Compile the project to catch any build errors. Stop if build fails:

```xml
<execute_command>
<command>pnpm build</command>
<requires_approval>false</requires_approval>
</execute_command>
```

If build failures occur, fix them before proceeding.

## 4) Test Execution

Run the test suite to ensure code correctness. Stop if tests fail:

```xml
<execute_command>
<command>pnpm test</command>
<requires_approval>false</requires_approval>
</execute_command>
```

If any test failures, fix them before proceeding.

## 5) Stage Files

If all checks pass, stage all modified files:

```xml
<execute_command>
<command>git add .</command>
<requires_approval>false</requires_approval>
</execute_command>
```

## 6) Generate Commit Message

Prepare a commit message based on git status:

- First, get the git status to understand changes:

```xml
<execute_command>
<command>git status --porcelain</command>
<requires_approval>false</requires_approval>
</execute_command>
```

- Then generate a summary and bullet points for the commit message.

## 7) Create Commit

Execute the commit with the generated message:

```xml
<execute_command>
<command>git commit -m "<generated-message>"</command>
<requires_approval>true</requires_approval>
</execute_command>
```

## 8) Push Prompt

Ask user if they want to push the code:

```xml
<ask_followup_question>
<question>Should I push the code to the repository?</question>
<options>["Yes", "No"]</options>
</ask_followup_question>
```

If "No", conclude workflow.

## 9) Branch Validation

If "Yes", check current branch:

```xml
<execute_command>
<command>git branch --show-current</command>
<requires_approval>false</requires_approval>
</execute_command>
```

If on "main", prompt for new branch:

```xml
<ask_followup_question>
<question>We are on main branch. Please provide a branch name to create:</question>
</ask_followup_question>
```

Then create and switch:

```xml
<execute_command>
<command>git checkout -b <branch-name></command>
<requires_approval>true</requires_approval>
</execute_command>
```

## 10) Update Memory Bank

Update documentation to reflect the changes:

- Read active context and modify appropriately

```xml
<read_file>
<path>memory-bank/activeContext.md</path>
</read_file>
```

- Add entry with current date and changes summary

Then update changelog and progress as needed.

## 11) Stage Memory Bank

Stage the memory bank updates:

```xml
<execute_command>
<command>git add memory-bank/</command>
<requires_approval>false</requires_approval>
</execute_command>
```

## 12) Amend Commit

Amend the previous commit with memory bank changes:

```xml
<execute_command>
<command>git commit --amend --no-edit</command>
<requires_approval>true</requires_approval>
</execute_command>
```

## 13) Push Repository

Push to remote:

```xml
<execute_command>
<command>git push</command>
<requires_approval>true</requires_approval>
</execute_command>
```

## 14) Conclusion

Workflow complete.

</detailed_sequence_of_steps>

<notes>
- Manual workflow; invoke with `/commit-task.md`.
- Stop and fix issues if any step fails.
- Ensure commit policy is respected by having explicit user approval.
- Memory bank updates should be brief but reflective.
</notes>
