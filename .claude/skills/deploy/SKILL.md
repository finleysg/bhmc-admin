---
description: Deploy app to production via GitHub Actions
user-invocable: true
arguments:
  - name: app
    description: App to deploy (api, public, web)
    required: true
---

# Deploy Skill

Deploy an app to production via GitHub Actions workflow.

## Usage

```
/deploy <app>
```

Where `<app>` is one of: `api`, `public`, `web`

## Instructions

1. Validate the app argument is one of: api, public, web
2. If invalid, show error with valid options
3. Trigger the workflow with date prefix:
   ```bash
   DATE_PREFIX="v$(date +%Y.%m.%d)"
   gh workflow run deploy-app.yml -f app=<app> -f date_prefix=$DATE_PREFIX
   ```
4. Get the run ID and show progress link:
   ```bash
   gh run list --workflow=deploy-app.yml --limit=1 --json databaseId,url
   ```
5. Report the workflow URL to user

## Example

User: `/deploy api`

Response:
```
Triggered deploy-app.yml for api
Workflow: https://github.com/finleysg/bhmc-admin/actions/runs/12345
```
