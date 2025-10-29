# Project Brief

Project: BHMC Admin — administrative interface for an existing golf tournament management site.

Purpose:

- Provide an admin UI to manage tournaments, players, schedules and integration with Golf Genius.
- Complement existing systems (React frontend at https://github.com/finleysg/bhmc and Django backend
  at https://github.com/finleysg/bhmc-api) rather than replace them.

Goals (minimal scaffold phase):

- Create a TurboRepo monorepo with pnpm workspaces.
- Provide minimal shells for two apps and one shared package:
  - apps/api (NestJS + TypeScript) — will use MySQL + Drizzle
  - apps/web (Next.js + TypeScript) — Tailwind + shadcn-ui + better-auth with SQLite for auth data
  - packages/dto — shared TypeScript DTOs
- Use Docker for databases (MySQL and SQLite).
- Provide memory bank documentation to preserve project context.

Out of scope for this phase:

- Full implementation of API endpoints or UI features.
- Production deployment configuration.
- Detailed Golf Genius integration implementation.

Authors: Project owner (you) + scaffolded by Cline
