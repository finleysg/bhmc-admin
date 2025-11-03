# System Patterns

Overview

- **Monorepo orchestrated with TurboRepo and pnpm workspaces**
- **Apps**:
  - `apps/api` — NestJS backend (TypeScript) using Drizzle ORM + MySQL with domain-driven design
  - `apps/web` — Next.js frontend (TypeScript) using better-auth for auth persistence (SQLite), TailwindCSS v4, daisyUI 5
- **Packages**:
  - `packages/dto` — shared TypeScript DTOs and types with workspace imports

Architecture patterns

- **Domain-Driven Design**: Events module demonstrates layered architecture with domain logic separated from infrastructure
- **Service boundary**: API app is the authoritative source for admin actions; frontend interacts via HTTP/REST
- **Shared types**: DTO package enforces consistent payloads across services with workspace imports
- **Database separation**: MySQL for domain data via Drizzle, SQLite for auth/session data (lightweight, file-backed)
- **Containerization**: Databases run in Docker (docker-compose) for environment parity and reproducible local dev
- **Dev workflow**: `pnpm` workspaces + Turbo for caching and task orchestration; `docker-compose up` brings up databases
- **Config management**: Environment-specific config via `.env` files with DATABASE_URL for MySQL connection

Data/migration patterns

- **Drizzle ORM**: Type-safe queries with no schema ownership (external database)
- **No migrations**: Service does not manage database schema - connects to existing MySQL database
- **Connection pooling**: DATABASE_URL environment variable with connection pooling via Drizzle
- **Schema definitions**: Complete database schema defined in `apps/api/src/database/schema/` with relations

Testing & quality patterns

- **Type-safe testing**: Jest configured with `Partial<T>` patterns for service mocks
- **Domain type usage**: Tests use actual domain types (`EventDomainData`, `RegistrationSlotDomainData`) instead of `any`
- **Zero ESLint errors**: Strict linting rules enforced with shared ESLint config
- **Prettier formatting**: Consistent code formatting applied across all files

Auth & Integration patterns

- **better-auth integration**: Planned for Next.js app with SQLite persistence
- **JWT validation**: NestJS API validates tokens from better-auth for protected admin endpoints
- **Golf Genius integration**: Complete bidirectional API integration with dedicated service modules, comprehensive error handling, retry logic, and audit logging

Observability & health

- **Health endpoints**: Both apps expose `/health` endpoints for liveness checks
- **Database connectivity**: Drizzle service provides connection health monitoring
- **Docker healthchecks**: Database containers configured with health monitoring

Scalability & separation

- **Layered architecture**: Domain logic separated from infrastructure (events module pattern)
- **Shared DTOs**: Type-safe data transfer objects consumed via workspace imports
- **Workspace boundaries**: No circular dependencies between apps and packages
- **Modular design**: Each module (events, courses, registration) follows consistent patterns

Notes

- **Domain-Driven Design**: Events module establishes the architectural pattern for other modules
- **Type Safety**: Strict TypeScript with comprehensive test coverage and zero ESLint violations
- **Database Strategy**: Drizzle ORM configured for external MySQL schema (no migrations)
- **Development Workflow**: TurboRepo caching with zero-error linting and type checking
