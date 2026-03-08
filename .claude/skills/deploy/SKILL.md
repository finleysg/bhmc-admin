---
name: deploy
description: Deploy the admin or public app to production by creating and pushing a date-versioned git tag. Use when the user wants to deploy an app to production.
allowed-tools: Bash(git:*), Bash(date:*)
---

# Deploy App to Production

Deploy an app (admin, api, public-next, or public) to production by creating and pushing a git tag that triggers the GitHub Actions deployment workflow.

## Tag Format

`{app}-v{yyyy}.{mm}.{dd}.{nn}`

- `{app}` is either `admin`, `api`, `backend`, or `public-next`
- `{yyyy}.{mm}.{dd}` is today's date
- `{nn}` is a zero-padded sequential number starting at 01

## Steps

### 1. Determine which app to deploy

If the user specified the app (e.g., `/deploy admin` or `/deploy api`), use that.
Otherwise, ask the user which app to deploy using AskUserQuestion with options "admin", "api", "backend", and "public-next".

### 2. Verify preconditions

Run these checks and stop with a clear error if any fail:

**Must be on main branch:**

```bash
git rev-parse --abbrev-ref HEAD
```

If not `main`, stop: "You must be on the main branch to deploy."

**Working tree must be clean:**

```bash
git status --porcelain
```

If non-empty, stop: "Working tree is not clean. Commit or stash changes first."

**Pull latest and fetch tags:**

```bash
git fetch --tags && git pull origin main
```

### 3. Calculate the next tag

```bash
DATE=$(date +%Y.%m.%d)
git tag -l "{app}-v${DATE}.*" | sort -V | tail -1
```

- If no tags exist for today, use `01`
- If the last tag is e.g. `admin-v2026.02.22.03`, the next number is `04`
- Zero-pad to two digits

### 4. Create and push the tag

```bash
git tag {tag}
git push origin {tag}
```

### 5. Report

Tell the user:

- The tag that was created
- Link to monitor: https://github.com/finleysg/bhmc-admin/actions
