# Initialize Better Auth (Linux / macOS — bash)

Run these commands from the repository root. This document provides a simple, repeatable sequence to
initialize Better Auth for local development: copy env files, prepare sqlite persistence, run
migrations, and seed an initial admin user.

Contract

- Inputs: `apps/web/.env.example`, `apps/api/.env.example`, the `@better-auth/cli` package.
- Outputs: a sqlite DB at `docker/sqlite/auth.db` with required tables, and a seeded admin user.
- Success: `@better-auth/cli migrate` runs successfully and `scripts/seed-admin.ts` creates the
  admin.

Quick checklist (what this does)

- copy example envs -> `apps/web/.env`, `apps/api/.env`
- ensure `docker/sqlite` exists
- install `@better-auth/cli` and `tsx` in `apps/web` (devDependencies)
- run migrations
- seed admin user

Prereqs

- Node (16/18/20 LTS recommended). Check with `node -v`.
- pnpm installed. Check with `pnpm -v`.
- sqlite3 CLI is helpful for verification but not required: `sqlite3 --version`.

Steps (bash)

1. Copy example env files and edit

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Open the files and set these values (they must be set before migrations/seeding):
# BETTER_AUTH_SECRET
# BETTER_AUTH_JWT_SECRET    # use the same JWT secret across apps if they share tokens
```

2. Ensure sqlite persistence folder exists

```bash
mkdir -p docker/sqlite
```

3. Install CLI and runner in `apps/web`

Installing locally to the package makes `pnpm exec` and `npx` behave consistently for migrations and
scripts.

```bash
cd apps/web
pnpm add -D @better-auth/cli tsx
cd -
```

4. Run Better Auth migrations (creates required tables)

You can export the env vars inline so they are only present for the command. Replace the secrets
below.

```bash
cd apps/web
export BETTER_AUTH_SECRET="your_better_auth_secret"
export BETTER_AUTH_JWT_SECRET="your_shared_jwt_secret"
# run migration
pnpm exec @better-auth/cli migrate
cd -
```

Notes:

- If the CLI is not installed globally, `pnpm exec @better-auth/cli` ensures the local devDependency
  is used.
- If the CLI prints config errors, confirm `apps/web/lib/auth.ts` exports the configured `auth`
  object and that environment variables are present to the process.

5. Seed initial admin user

The repository contains `apps/web/scripts/seed-admin.ts`. Run it with `tsx` via `pnpm exec` so it
uses the local `tsx` you installed above.

Set env vars in the shell or pass args (script supports both). Example — using env vars:

```bash
cd apps/web
export SEED_ADMIN_EMAIL="admin@example.com"
export SEED_ADMIN_PASSWORD="ChangeMe"
pnpm exec tsx scripts/seed-admin.ts
cd -
```

Or pass as args:

```bash
cd apps/web
pnpm exec tsx scripts/seed-admin.ts admin@example.com ChangeMe
cd -
```

6. Verify DB and tables (optional)

If you have the sqlite3 CLI installed you can inspect the DB:

```bash
sqlite3 docker/sqlite/auth.db ".tables"

# or open interactive shell
sqlite3 docker/sqlite/auth.db
# then run: .tables
```

Expect tables such as: `user`, `account`, `session`, `verification` (plugin tables vary).

Troubleshooting & tips

- If `pnpm exec` fails, ensure you ran `pnpm install` at repo root.
- If migrations fail with Node engine or dependency errors, consider upgrading/downgrading Node to a
  recommended LTS.
- If environment values are missing, exporting them inline before the command avoids editing files.
  Example (one-liner):

```bash
cd apps/web && BETTER_AUTH_SECRET=secret BETTER_AUTH_JWT_SECRET=jwtsecret pnpm exec @better-auth/cli migrate && cd -
```

Quick run (all-in-one)

Run this from repo root (replace secrets and admin credentials):

```bash
# copy envs
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# ensure sqlite dir
mkdir -p docker/sqlite

# install CLI + tsx in apps/web (only needed once)
cd apps/web
pnpm add -D @better-auth/cli tsx

# run migrations and seed admin (replace secrets below)
BETTER_AUTH_SECRET="your_better_auth_secret" \
BETTER_AUTH_JWT_SECRET="your_shared_jwt_secret" \
pnpm exec @better-auth/cli migrate

SEED_ADMIN_EMAIL="admin@example.com" SEED_ADMIN_PASSWORD="ChangeMe" pnpm exec tsx scripts/seed-admin.ts
cd -
```

If you'd like, I can:

- adjust these steps to use an npm script in `apps/web/package.json` so you can run
  `pnpm --filter apps/web run auth:init`,
- or create a small `scripts/init-better-auth.sh` helper script checked into the repo for
  reproducible setup.

# Initialize Better Auth (Windows - exact commands)

Run these from the repository root (c:\code\learn\monorepo). Use PowerShell or cmd as noted.

1. Copy example envs and edit with real secrets PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env -Force
Copy-Item apps/api/.env.example apps/api/.env -Force
# then open apps/web/.env and apps/api/.env and set:
# BETTER_AUTH_SECRET and BETTER_AUTH_JWT_SECRET (same JWT secret for cross-app)
```

2. Ensure sqlite persistence folder exists PowerShell:

```powershell
New-Item -ItemType Directory -Path .\docker\sqlite -Force
```

cmd.exe:

```cmd
mkdir docker\sqlite
```

3. Install CLI + runner in apps/web (so migrate + seed run reliably) PowerShell:

```powershell
cd apps\web
pnpm add -D @better-auth/cli tsx
cd ..
```

cmd:

```cmd
cd apps\web
pnpm add -D @better-auth/cli tsx
cd ..
```

4. Run Better Auth migrations (creates required tables) PowerShell (preferred; ensure apps/web/.env
   contains secrets or set env vars in-session):

```powershell
cd apps\web
$env:BETTER_AUTH_SECRET = "your_better_auth_secret"
$env:BETTER_AUTH_JWT_SECRET = "your_shared_jwt_secret"
npx @better-auth/cli migrate
```

cmd.exe alternative:

```cmd
cd apps\web
set BETTER_AUTH_SECRET=your_better_auth_secret
set BETTER_AUTH_JWT_SECRET=your_shared_jwt_secret
npx @better-auth/cli migrate
```

Notes:

- If `npx` prompts to install the CLI, accept (it will install to temp).
- If the CLI complains it can't read your config, confirm `apps/web/lib/auth.ts` exports the `auth`
  instance (default export or named `auth`) and that environment vars are available.

5. Seed initial admin user Use tsx to avoid PowerShell `pnpm.ps1` execution policy problem:
   PowerShell / cmd:

```powershell
cd apps\web
npx tsx scripts/seed-admin.ts
# or
pnpm exec tsx scripts/seed-admin.ts
```

The script reads SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from env or args: PowerShell example:

```powershell
$env:SEED_ADMIN_EMAIL = "admin@example.com"
$env:SEED_ADMIN_PASSWORD = "ChangeMe"
npx tsx scripts/seed-admin.ts
```

Or pass as args:

```cmd
npx tsx scripts/seed-admin.ts admin@example.com ChangeMe
```

6. Verify DB and tables If you have sqlite3 installed:

```cmd
sqlite3 .\docker\sqlite\auth.db ".tables"
```

Expect tables like: user, account, session, verification (and plugin-specific tables).

7. Troubleshooting

- If PowerShell blocks `pnpm` scripts: run from cmd.exe or set execution policy temporarily:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
```

- If CLI reports Node engine warnings, they are usually warnings; migration still often completes.
  Upgrade Node if errors block execution.

Summary sequence (quick): PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env -Force
New-Item -ItemType Directory -Path .\docker\sqlite -Force
cd apps\web
pnpm add -D @better-auth/cli tsx
$env:BETTER_AUTH_SECRET="secret"
$env:BETTER_AUTH_JWT_SECRET="jwtsecret"
npx @better-auth/cli migrate
$env:SEED_ADMIN_EMAIL="admin@example.com"
$env:SEED_ADMIN_PASSWORD="ChangeMe"
npx tsx scripts/seed-admin.ts
```
