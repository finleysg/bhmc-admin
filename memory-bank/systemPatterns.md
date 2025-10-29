# System Patterns

Overview

- Monorepo orchestrated with TurboRepo and pnpm workspaces.
- Apps:
  - `apps/api` — NestJS backend (TypeScript) using Drizzle ORM + MySQL.
  - `apps/web` — Next.js frontend (TypeScript) using better-auth for auth persistence (SQLite),
    TailwindCSS, shadcn/ui.
- Packages:
  - `packages/dto` — shared TypeScript DTOs and types.

Architecture patterns

- Service boundary: API app is the authoritative source for admin actions; frontend interacts via
  HTTP/REST (or GraphQL later).
- Shared types: DTO package enforces consistent payloads across services.
- Database separation: MySQL for domain data, SQLite for auth/session data (lightweight,
  file-backed).
- Containerization: Databases run in Docker (docker-compose) for environment parity and reproducible
  local dev.
- Dev workflow: `pnpm` workspaces + Turbo for caching and task orchestration; `docker-compose up`
  brings up databases.
- Config management: Environment-specific config via .env files (local/.env.development), with
  secrets injected into Docker or local env.

Data/migration patterns

- Use Drizzle for type-safe queries and migrations in the NestJS app.
- Migrations stored in `apps/api/prisma`-style folder (or `drizzle` folder) and run via pnpm
  scripts.
- Seed scripts live next to migrations for initial dev data.

Auth & Integration patterns

- better-auth in the Next.js app persists auth data to a SQLite file mounted under `docker/sqlite`.
- NestJS validates tokens/cookies from better-auth for protected admin APIs.
- External integration (Golf Genius) done through dedicated integration service modules within
  `apps/api` (abstracted behind interfaces to allow mocking/testing).

Observability & health

- Each app exposes a minimal health endpoint (`/health`) for liveness checks.
- Docker healthchecks for database containers.

Scalability & separation

- Keep DTOs minimal and stable; evolve via versioning if breaking changes required.
- Separate concerns: UI, API, shared types; avoid circular dependencies through workspace
  boundaries.

Notes

- These patterns will be expanded in `techContext.md` and iterated as the scaffold evolves.
