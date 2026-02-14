# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Golf tournament management system for Bunker Hills Men's Club (BHMC). This monorepo contains the admin API and admin web dashboard. It complements a separate Django backend (data.bhmc.org) that owns the database schema and a React SPA (bhmc.org) for public-facing users.

## Monorepo Structure

- **apps/api** — NestJS admin API: Golf Genius sync, Stripe callbacks, registration flow with SSE. Uses Drizzle ORM against external MySQL (no migrations here).
- **apps/web** — Next.js admin dashboard: player management, Golf Genius UI, reporting, Excel export. Uses better-auth with SQLite for authentication.
- **apps/public** — Legacy React SPA (being replaced by public-next). Bootstrap v5, Tanstack Query, React Hook Form.
- **apps/public-next** — Next.js rewrite of the public site (in progress).
- **packages/domain** — Shared TypeScript types and DTOs, aliased as `dto` in tsconfig paths.
- **packages/eslint-config** — Shared ESLint 9 config used by api, web, and domain.
- **backend/** — Django REST backend (separate project, included for reference). Owns schema/migrations. Run with `uv`.

Each app has its own `CLAUDE.md` with app-specific patterns — read those before working in an app.

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps in parallel
pnpm build                # Build all packages/apps
pnpm lint                 # Lint all code
pnpm lint:fix             # Lint + auto-fix
pnpm format               # Format with prettier
pnpm test                 # Run all tests
pnpm typecheck            # TypeScript noEmit check
pnpm docker:up            # Start dev containers (MySQL, Redis, Stripe CLI, Mailpit)
pnpm docker:down          # Stop dev containers
```

Run commands for a single app:

```bash
pnpm --filter api dev     # Run just the API
pnpm --filter web dev     # Run just the web dashboard
pnpm --filter api test    # Test just the API
```

Single test file (apps/public uses vitest, others use jest):

```bash
# Jest (api, web)
npx jest --testPathPattern=path/to/test.test.ts

# Vitest (public)
npx vitest run src/path/to/test.test.tsx
```

Backend (Django):

```bash
cd backend && uv sync
uv run python manage.py runserver
uv run python manage.py test
```

## Code Style

- **Formatter**: Prettier — tabs, no semicolons, double quotes, 100 char print width
- **TypeScript**: Strict mode, no `any` in production code
- **Pre-commit hooks**: Husky runs lint-staged, typecheck, and tests before every commit

NOTE: we have customized Prettier in the following way:

```json
{
	"printWidth": 100,
	"semi": false,
	"singleQuote": false,
	"useTabs": true
}
```

This project uses TypeScript with strict mode. Always handle possibly-undefined array accesses with non-null assertions or proper guards. Use the full markdown editor component (ContentEditor) for any rich text fields, not simplified alternatives.

## Architecture

```
UI Layer:  apps/web (admin)  |  apps/public (users)
API Layer: apps/api (NestJS) |  backend/ (Django)
Data:      External managed MySQL  |  SQLite (web auth only)
External:  Stripe, AWS S3, Mailgun, Golf Genius
```

- The Django backend at data.bhmc.org is the source of truth for data. The NestJS API reads/writes the same MySQL database using Drizzle ORM (schema defined externally — no migrations in this repo).
- The web admin authenticates users via better-auth (SQLite) then proxies API calls to the Django backend with Django auth tokens.
- The NestJS API handles Golf Genius integration, Stripe webhooks, and the registration SSE flow.

## Deployment

Deployed to DigitalOcean via CapRover. GitHub Actions triggers on release tags (`v*`). See `DEPLOYMENT.md` for full details.

- `apps/api/Dockerfile` — API production build
- `apps/web/Dockerfile` — Web production build
- `.github/workflows/deploy.yml` — CI/CD pipeline

## Feedback

Use the following tools / commands as feedback on your work.

`pnpm format`
`pnpm lint` (fix warnings and errors, even if pre-existing)
`pnpm test` (fix failures, even if pre-existing)
`pnpm build`

When a change is made to a next app, rebuild the container.

### IMPORTANT: UX Feedback

Use the `chrome-devtools` skill to validate your work directly in the browser:

- Public site: http://localhost:3000
- Admin next site: http://localhost:3100
- Public next site: http://localhost:3200
