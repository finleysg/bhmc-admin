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
