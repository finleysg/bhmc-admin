# Tech Context

Core tools & versions

- Node & pnpm
  - Node.js (LTS recommended, e.g., 18+ or 20+)
  - pnpm for workspace management (pnpm@10+ used in scaffold)
- TurboRepo
  - turbo for task orchestration and caching
- TypeScript
  - Central workspace TypeScript dependency for consistent typings (TS 5+ recommended)

Apps

- apps/api

  - Framework: NestJS (TypeScript)
  - ORM: Drizzle (type-safe queries + migrations)
  - Database: MySQL (containerized via docker-compose)
  - Conn config: env-driven (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)
  - Migrations: Drizzle migrations folder under `apps/api/drizzle` and pnpm scripts to run them
  - Health endpoint: `GET /health`

- apps/web
  - Framework: Next.js (App Router, TypeScript)
  - Auth: better-auth (stores auth data in SQLite file)
  - UI: TailwindCSS + shadcn/ui
  - SQLite storage: mounted path `./docker/sqlite/auth.db` (accessible to local Next.js process)
  - Health endpoint: `GET /health`

Packages

- packages/dto
  - Type-only package exporting interfaces/types used by both apps
  - Built with TypeScript and consumed via workspace import (e.g.,
    `import { TournamentDTO } from 'dto'`)

Databases & Docker

- docker-compose.yml orchestrates:
  - mysql: image `mysql:8.0`, port 3306, volume `mysql-data`
  - sqlite: file-backed under `./docker/sqlite` (auth.db)
- Databases always run in Docker containers for dev parity
- Use docker volumes for persistence and easy reset/seed scripts

Development & scripts

- Workspace scripts (root package.json) to add:
  - `dev`: run turbo dev tasks for both apps
  - `build`: turbo build
  - `docker:up`: `docker-compose up -d`
  - `docker:down`: `docker-compose down`
  - `db:seed` / `db:reset` for MySQL seed/migration workflows
- Each app has local scripts:
  - `start`, `dev`, `build`, `lint`, `test` (placeholders in scaffold)

Type & linting

- Shared tsconfig at root; apps extend it
- ESLint + Prettier recommended but not installed in scaffold phase

Secrets & env

- Use `.env` files per app (`apps/api/.env`, `apps/web/.env`) ignored by git
- Docker envs for DB credentials are defined in docker-compose.yml for dev

CI / Pipeline notes

- Turbo pipeline will run `build` and reuse cached outputs
- Add CI steps later to run lint/test/build in isolated environments

Notes & constraints

- Keep scaffold minimal: implement health endpoints and minimal DB wiring only.
- Ensure DTOs are type-only to avoid runtime bundling issues.
- Avoid circular workspace dependencies.
