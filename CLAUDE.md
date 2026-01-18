# CLAUDE.md

In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Project Overview

Bunker Hills Men's Club is a group of golf enthusiastics who compete in weekly and monthly competitions throughout
the summery. This monorepo contains the websites and services to manage every aspect of the club's online experience:

- Public facing website for club information and event registration
- Django backend provides a RESTful layer over club data and django's built-in table administration screens
- MySQL to store club data
- Backend nestjs api to orchestrate administration, registration and payments, and integration with the Golf Genius
  tournament management system
- Administrative next.js website to manage events, members, players, reports, etc.

```
bhmc-admin/
├── apps/
│   ├── api/        # NestJS (API)
│   ├── web/        # Next.js (admin website)
│   └── public/     # React SPA (member site)
├── backend/        # Django RESTful backend
├── packages/
│   ├── domain/     # Shared TS types (used by all TS apps)
│   └── eslint-config/
├── pnpm-workspace.yaml
└── turbo.json
```

## Commands

This monorepo uses `pnpm`.

We always run and test locally using the `docker-compose.yml` file at the root.

Inspect the logs from these containers when troubleshooting.

```bash
# Development
docker compose up -d --build

# Build
pnpm build                  # Build all packages

# Testing
pnpm test                   # Run all tests
pnpm --filter api test      # API tests only
pnpm --filter web test      # Web tests only
pnpm --filter api test -- --testPathPattern="events"  # Run specific test file/pattern

# Linting & Formatting
pnpm lint                   # ESLint check
pnpm lint:fix               # ESLint fix
pnpm format                 # Prettier format
pnpm format:check           # Prettier check
```

## General Agent Instructions

Please write a high-quality, general-purpose solution using the standard tools available. Do not create helper scripts or workarounds to accomplish the task more efficiently. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.

**IMPORTANT**: At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise.
