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
- **Test data factories**: Consistent test fixture creation with typed factory functions
- **Mock strategies**: Service dependency mocking using `Partial<T>` with proper interface compliance
- **Integration testing**: API endpoint testing with realistic data and error scenarios
- **Zero ESLint errors**: Strict linting rules enforced with shared ESLint config
- **Prettier formatting**: Consistent code formatting applied across all files
- **Advanced Type Safety**: Generic parsers with constrained types, discriminated unions for variants, type guards over assertions, and strict type assertion guidelines
- **Type-First Development**: Interfaces and types defined before implementation, with clear guidelines for when to extend vs create separate interfaces

Code organization patterns

- **Feature-based modules**: Each domain area (events, courses, registration) organized as self-contained modules
- **Layer separation**: domain/dto/services/controllers structure within each module
- **Shared package boundaries**: Strict import rules preventing circular dependencies
- **File naming conventions**: Consistent kebab-case for files, PascalCase for classes/interfaces
- **Test organization**: Test files mirror source structure with descriptive naming
- **Configuration grouping**: Related configuration grouped by domain/feature

Auth & Integration patterns

- **better-auth integration**: Implemented in Next.js app with SQLite persistence using better-sqlite3 and Kysely ORM
- **JWT validation**: NestJS API validates tokens from better-auth for protected admin endpoints
- **Golf Genius integration**: Complete bidirectional API integration with dedicated service modules, comprehensive error handling, retry logic, and audit logging
- **Tournament Results Import**: Format-specific parsers (points, skins, proxy, stroke play) with flexible DTOs accommodating API inconsistencies; idempotent operations with result deletion before import; ordinal position formatting (1st, 2nd, T3rd); comprehensive unit test coverage

Error handling patterns

- **Custom error classes**: ApiError, AuthError, RateLimitError with consistent error interfaces and metadata
- **Global exception filters**: NestJS exception filters for standardized HTTP error responses
- **Integration interceptors**: Automatic audit logging for Golf Genius operations with full request/response details
- **Retry strategies**: Exponential backoff for external API calls with configurable retry limits
- **Error classification**: Structured error types for different failure modes (network, auth, rate limit, data validation)

Configuration patterns

- **Environment validation**: Joi schemas for runtime configuration validation on startup
- **Centralized config modules**: Type-safe configuration access with environment-specific loading
- **Configuration hierarchy**: Environment variables → validation schemas → typed config objects
- **Secret management**: Environment-based secrets with validation and secure defaults

API integration patterns

- **HTTP client configuration**: Axios clients with request/response interceptors for logging and error handling
- **Rate limiting**: Configurable rate limits with queue management and backoff strategies
- **Request monitoring**: Comprehensive logging of all external API interactions
- **Idempotent operations**: Safe retry patterns for non-idempotent operations
- **Response normalization**: Consistent error handling and data transformation across integrations

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
