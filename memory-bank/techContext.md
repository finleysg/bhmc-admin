# Tech Context

Core tools & versions

- **Node & pnpm**: Node.js 20+, pnpm@10+ for workspace management
- **TurboRepo**: turbo@2+ for task orchestration and caching
- **TypeScript**: TS 5.6+ with strict type checking and no `any` types in production
- **ESLint & Prettier**: Configured with shared rules, zero ESLint errors achieved

Apps

- **apps/api**
  - Framework: NestJS 10+ (TypeScript)
  - ORM: Drizzle v0.44.7 (type-safe queries, no migrations - external schema)
  - Database: MySQL 8.0 (containerized via docker-compose)
  - Connection: DATABASE_URL env variable with connection pooling
  - Architecture: Domain-driven design with service/controller/DTO layers
  - Testing: Jest with type-safe mocks using `Partial<T>` patterns
  - Health endpoint: `GET /health`

- **apps/web**
  - Framework: Next.js 15+ (App Router, TypeScript)
  - Auth: better-auth (planned, stores auth data in SQLite file)
  - UI: Tailwind CSS v4 + daisyUI 5 (emerald/sunset themes)
  - SQLite storage: mounted path `./docker/sqlite/auth.db`
  - Health endpoint: `GET /health` (planned)

Packages

- **packages/dto**
  - Type-only package exporting interfaces/types used by both apps
  - Built with TypeScript and consumed via workspace import
  - Contains DTOs for events, scores, registration, and player data
  - Example: `import { EventDto } from '@repo/dto'`

Databases & Docker

- **docker-compose.yml** orchestrates:
  - mysql: image `mysql:8.0`, port 3306, volume `mysql-data`
  - sqlite: file-backed under `./docker/sqlite` (auth.db planned)
- Databases run in Docker containers for development parity
- Drizzle configured for MySQL with no schema ownership (external database)

Development & scripts

- **Workspace scripts** (root package.json):
  - `dev`: turbo dev tasks for both apps
  - `build`: turbo build pipeline
  - `docker:up`: `docker-compose up -d`
  - `docker:down`: `docker-compose down`
  - `lint`: ESLint across workspace with zero errors
- **App scripts**:
  - `start`, `dev`, `build`, `lint`, `test` configured
  - TypeScript compilation with `tsc -p tsconfig.json`

Type & linting

- **Shared tsconfig**: Root-level TypeScript config extended by apps
- **ESLint**: Shared config in `packages/eslint-config` with strict rules
- **Prettier**: Configured with consistent formatting
- **Type Safety**: No `any` types in production; domain types used throughout

Secrets & env

- **Environment files**: `.env` files per app (ignored by git)
- **Database URL**: `DATABASE_URL` for MySQL connection string
- **Docker envs**: DB credentials defined in docker-compose.yml for dev

CI / Pipeline notes

- **Turbo pipeline**: Runs `build`, `lint`, `test` with caching
- **Zero errors**: ESLint returns zero errors, TypeScript compiles cleanly
- **Test coverage**: Jest configured with type-safe test patterns

Notes & constraints

- **Domain-Driven Design**: Events module demonstrates the pattern for other modules
- **Type Safety First**: Strict TypeScript with comprehensive test coverage
- **External Schema**: Drizzle configured without migrations (no schema ownership)
- **Shared Types**: DTO package enforces consistency across API and web app
