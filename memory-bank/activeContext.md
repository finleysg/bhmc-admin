# Active Context

Current focus:

- Scaffold a minimal TurboRepo monorepo (pnpm workspaces) that contains:
  - apps/api (NestJS + TypeScript) — planned to use MySQL + Drizzle
  - apps/web (Next.js + TypeScript) — planned to use better-auth with SQLite, Tailwind CSS v4, custom components
  - packages/dto — shared TypeScript DTOs
- Provide Docker Compose for MySQL and an on-disk SQLite data folder for auth.
- Create memory bank documentation to preserve decisions and progress.

Recent changes:

- Initialized pnpm workspace and installed Turbo.
- Created workspace folders: `apps/api`, `apps/web`, `packages/dto`, `docker`.
- Added `pnpm-workspace.yaml`, `turbo.json`, and `docker-compose.yml`.
- Added minimal `package.json` files for each workspace package.
- Added `memory-bank/projectBrief.md` and `memory-bank/productContext.md`.
- Implemented theme switching with emerald (light) and sunset (dark) themes:
  - Updated daisyUI config to use emerald as default and sunset as prefersdark
  - Created ThemeToggle component with sun/moon icons using swap animation
  - Added theme toggle to layout header with responsive design
  - Themes automatically respect browser/OS dark mode preference

Next immediate steps:

1. Add remaining memory bank files: `systemPatterns.md`, `techContext.md`, `progress.md`.
2. Scaffold minimal NestJS app inside `apps/api` (basic Nest CLI structure or minimal src files) and
   wire Drizzle config to use the Docker MySQL.
3. Scaffold minimal Next.js app inside `apps/web` (TypeScript + Tailwind CSS v4 + custom components) and configure
   better-auth to persist to `./docker/sqlite/auth.db`.
4. Create an initial DTO file in `packages/dto` exporting a sample type used by both apps.
5. Add pnpm scripts and turbo pipeline tasks for dev/build.
6. Verify Docker databases start and apps can connect (minimal health checks).

Important decisions & constraints:

- Use pnpm workspaces for package management.
- Databases must run in Docker containers (MySQL for main data; SQLite file for auth).
- Keep the initial shell minimal — no feature implementations beyond health endpoints and basic
  connection wiring.
- Memory bank files are authoritative and must be updated after every significant change.

Notes for future work:

- Document Golf Genius integration points once data-model decisions are finalized.
- Add migration strategy (Drizzle) and seed scripts.
