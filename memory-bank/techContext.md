# Tech Context

Core tools & versions

- **Node & pnpm**: Node.js 20+, pnpm@10+ for workspace management
- **TurboRepo**: turbo@2+ for task orchestration and caching
- **TypeScript**: TS 5.6+ with strict type checking and no `any` types in production
- **ESLint & Prettier**: Configured with shared rules, zero ESLint errors achieved

Apps

- **apps/api**
  - Framework: NestJS 10.4.20 (TypeScript)
  - ORM: Drizzle v0.44.7 (type-safe queries, no migrations - external schema)
  - Database: MySQL 8.0 (containerized via docker-compose)
  - Connection: DATABASE_URL env variable with connection pooling
  - Architecture: Domain-driven design with service/controller/DTO layers
  - Validation/Schema: Zod v4.1.12 (runtime validation), Drizzle-Zod v0.8.3 (schema generation from DB models), Joi v18.0.1 (env/config validation), Class-Validator v0.14.2 (DTOs)
  - HTTP/Integration: Axios v1.13.1 (HTTP client with retry/rate limits), RxJS v7.8.2 (reactive prog for SSE streaming)
  - Auth/JWT: JSONWebToken v9.0.2 (validation), Node-Jose v2.2.0 (EdDSA token processing)
  - Testing: Jest with type-safe mocks using `Partial<T>` patterns; comprehensive unit tests for domain functions (48 tests) and API utilities (42 tests)
  - Reporting: ExcelJS v4.4.0 for server-side Excel generation in reports module
  - Health endpoint: `GET /health`

- **apps/web**
  - Framework: Next.js 16.0.1 (App Router, TypeScript)
  - Auth: better-auth v1.3.34 with better-sqlite3 and Kysely ORM
  - UI: Tailwind CSS v4 + daisyUI 5 (emerald/sunset themes)
  - Table Library: @tanstack/react-table v8.21.3 for client-side sorting, filtering, and pagination
  - SQLite storage: file path `./apps/web/data/auth.db`
  - Health endpoint: `GET /health`

Packages

- **packages/domain**
  - Type-only package exporting interfaces/types used by both apps
  - Built with TypeScript and consumed via workspace import
  - Contains DTOs for events, scores, registration, and player data
  - Example: `import { EventDto } from '@repo/domain'`

Golf Genius Integration

- **API Client**: Axios-based HTTP client with retry logic, rate limiting, and error handling
- **Configuration**: Environment variables for API key, base URL, timeout, retries, and category filtering
- **Services**: 6 specialized services (EventSync, MemberSync, RosterExport, ScoresImport, ResultsImport, IntegrationLog)
- **Database**: Integration audit trail stored in `core_golfgeniusintegrationlog` table
- **Error Handling**: Custom error classes (ApiError, AuthError, RateLimitError) with detailed logging
- **REST Endpoints**: 10 endpoints for roster sync, event sync, roster export, scores import, tournament results import (points/skins/proxy/stroke), and logs
- **Tournament Results**: Format-specific parsers (points, skins, proxy, stroke play, team) with flexible DTOs; idempotent operations; ordinal position formatting; blind draw exclusion for team tournaments; comprehensive unit tests

Dependencies by Category

- **Validation/Schema**: Zod v4.1.12 (runtime validation for API payloads), Drizzle-Zod v0.8.3 (automatic Zod schema generation from Drizzle DB tables), Joi v18.0.1 (environment variable validation), Class-Validator v0.14.2 (NestJS DTO validation decorators)
- **HTTP/Reactive/Streaming**: Axios v1.13.1 (Golf Genius API client with interceptors and retries), RxJS v7.8.2 (reactive programming for SSE progress updates and async operations)
- **Auth/JWT Handling**: JSONWebToken v9.0.2 (symmetric JWT validation), Node-Jose v2.2.0 (asymmetric EdDSA token support for better-auth integration)
- **UI/Animations/Components**: Framer Motion v12.23.24 (smooth transitions and loading states in action cards/reports), React Day Picker v9.11.1 (date selection for calendars and report filters), @heroicons/react v2.2.0 (icon library for UI consistency)
- **Database Extensions**: MySQL2 v3.15.3 (Drizzle MySQL driver), Better-SQLite3 v12.4.1 (better-auth SQLite persistence), Kysely v0.28.8 (query builder for auth library)
- **Reporting/Utilities**: ExcelJS v4.4.0 (server-side Excel file generation with styling for event/points reports), Reflect-Metadata v0.2.2 (NestJS dependency injection utilities)

Databases & Docker

- **docker-compose.yml** orchestrates:
  - mysql: image `mysql:8.0`, port 3306, volume `mysql-data`
  - sqlite: file-backed under `./apps/web/data` (auth.db implemented)
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
- **Advanced TypeScript Practices**: Comprehensive guidelines in `.clinerules/typescript-practices.md` covering type-first development, generic parsers, discriminated unions, type guards, utility types, and strict configuration requirements
- **Type Assertion Guidelines**: Clear rules for when `as` assertions are acceptable with documentation requirements

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
- **Shared Types**: domain package enforces consistency across API and web app
- **Module Organization**: Each API module (scores, registration, events, courses) has a barrel export (`index.ts`) defining its public API; public exports include DTOs used in API responses/integrations and service classes; private elements like mappers and domain logic remain internal; cross-module dependencies use barrel imports for cleaner code (e.g., `import { PlayerDto } from '../registration'`); this pattern reduces import path complexity and enforces module boundaries
