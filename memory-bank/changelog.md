# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Team Tournament Results Import**: Implemented complete team results import functionality with blind draw exclusion; added "Import Team Results" action to integration workflow, created team-specific parser and service logic, implemented team name parsing to identify blind players using "Bl[firstname lastname]" pattern, and added tracking for skipped blind players in import summaries
- **Blind Draw Exclusion Logic**: Added business rule to skip blind draws from tournament payouts; parses team names to extract blind player names, matches against registered players using full name comparison, skips blind players from tournamentResult record creation while logging exclusions, and tracks skipped count in import results
- **Team Results API Route**: Created Next.js proxy route `/api/golfgenius/events/[id]/import-team-results` to handle team-specific result imports with proper authentication and SSE streaming support
- **Module Barrel Exports**: Implemented consistent barrel export pattern across all major API modules (scores, registration, events, courses); created `index.ts` files in each module root exporting public DTOs and services; updated cross-module imports to use cleaner module-level imports instead of deep relative paths; benefits include clearer public APIs, easier refactoring, and consistent NestJS patterns

- **Per-Player Progress Emissions**: Completed implementation of per-player progress callbacks for all 4 Golf Genius results import methods (points, skins, proxy, stroke); updated `processResults` method to accept optional `onPlayerProcessed` callback, modified player processing loop to emit progress after each player, and updated all format-specific processor methods to pass through the callback parameter
- **Type Safety Improvements**: Completed comprehensive type safety enhancements for GolfGenius results import service including discriminated union types for tournament aggregates (Points, Skins, Proxy, Stroke), proper API response types replacing `any`, circular dependency resolution with barrel file exports, and VS Code settings updates to prevent auto-removal of imports
- **Golf Genius Integration Orchestrator UI**: Complete phase-based workflow with 3 phases (Setup, Import Results, Finalize); automatic state derivation from integration logs
- **Action-to-Endpoint Mapping System**: Centralized mapping in `apps/web/lib/integration-actions.ts` for all 8 IntegrationActionName values to backend endpoints
- **Dynamic API Proxy Route**: Single route `/api/golfgenius/events/[id]/[action]` handles all integration actions through Next.js API proxy with validation
- **Real Integration Action Execution**: Updated IntegrationActionCard with live API calls, loading states, error handling, and automatic log refresh
- **Phase-Based Workflow**: Three-phase orchestration with smart gating, sequential requirements, numbered action indicators, and phase navigation controls
- **Event Context Display**: Shows working event as "{start date}: {event name}" throughout the integration workflow

### Changed

- **Golf Genius Page**: Replaced static action cards with dynamic IntegrationOrchestrator component
- **IntegrationActionCard**: Added onComplete callback prop and real API execution instead of placeholder alerts

### Fixed

- **SSE Roster Export**: Resolved "Connection lost" issue by implementing streaming-first architecture; eliminated race condition between export initialization and SSE connection by returning RxJS Subject synchronously while processing export asynchronously in background; simplified frontend to use single SSE endpoint that auto-starts export
- **Roster Export Service**: Implemented parallel processing for roster export operations, fixed TypeScript type issues in roster-export.service.ts, added proper types for processSinglePlayer parameters, improved result aggregation method typing, and fixed getEventRoster to unwrap Golf Genius API member objects before mapping
- **Golf Genius API Integration**: Fixed database insertion errors during event synchronization by correcting API response unwrapping patterns and datetime handling
- **Tournament Unwrapping**: Discovered tournaments are wrapped in `event` property (not `tournament`), fixed all API client methods to use defensive unwrapping: `item.event || item`
- **Datetime Format Issues**: Resolved MySQL datetime insertion errors by changing schema from `mode: "string"` to `mode: "date"` and converting ISO strings to Date objects
- **Integration Logging**: Enhanced error logging to reveal actual MySQL errors masked by generic Drizzle messages; fixed double JSON.stringify issue in details field

### Technical

- **SSE Streaming Pattern**: Established streaming-first architecture for real-time operations; return RxJS Subject synchronously from service methods while processing work asynchronously in background; eliminates race conditions between operation initialization and progress streaming connections
- **UI Patterns**: Added phase-based orchestration, derived state management, action mapping, and component callback patterns
- **Type Safety**: Maintained strict TypeScript usage with proper error handling and loading states
- **API Architecture**: Single dynamic route pattern for integration actions with validation and authentication
- **Golf Genius API Patterns**: Established defensive unwrapping patterns for inconsistent API response structures
- **Drizzle ORM Datetime Handling**: Documented schema mode differences and datetime conversion requirements for MySQL compatibility

## [0.5.0] - 2025-11-06

### Added

- **Tournament Results Import**: Implemented comprehensive TypeScript solution for importing Golf Genius tournament results with format-specific parsers (points, skins, proxy, stroke play); includes flexible DTOs, result parsers with ordinal logic, service skeleton, controller endpoints, and comprehensive unit tests
- **Close Event Feature**: Added POST /events/:eventId/close endpoint that updates all tournament result payoutStatus to "Confirmed" and payoutDate to current timestamp; includes comprehensive validation (event must have tournaments and results, cannot be already closed) and proper error handling
- **Advanced Type Safety**: Implemented comprehensive TypeScript improvements across Golf Genius services including generic parsers with constrained types, discriminated unions for tournament formats, type guards over assertions, and strict type assertion guidelines; eliminated unsafe `as any` casts while maintaining parser compatibility
- **Type-First Development**: Interfaces and types defined before implementation, with clear guidelines for when to extend vs create separate interfaces
- **Development Guidelines**: Updated TypeScript practices rule file with comprehensive guidelines covering type-first development, generic parser patterns, discriminated unions, utility types, type guards, interface extension strategies, and strict configuration requirements

### Changed

- **Code Quality**: Fixed 99 ESLint violations in test files by replacing `any` types with proper domain types; achieved zero ESLint errors across codebase; applied Prettier formatting consistently
- **TypeScript & Testing**: Ensured TypeScript compilation success, established test patterns using `Partial<T>` for service mocks, and maintained type safety throughout

## [0.4.0] - 2025-11-05

### Added

- **Golf Genius Integration Module**: Complete bidirectional integration with Golf Genius API v2 including event sync, member roster sync, roster export, scores import, and comprehensive error handling with retry logic and rate limiting
- **Tournament Results Import**: Format-specific parsers (points, skins, proxy, stroke play) with flexible DTOs accommodating API inconsistencies; idempotent operations with result deletion before import; ordinal position formatting (1st, 2nd, T3rd); comprehensive unit test coverage

### Technical

- **Integration interceptors**: Automatic audit logging for Golf Genius operations with full request/response details
- **Retry strategies**: Exponential backoff for external API calls with configurable retry limits
- **Error classification**: Structured error types for different failure modes (network, auth, rate limit, data validation)

## [0.3.0] - 2025-11-04

### Added

- **Events Module**: Built complete events module with service, controller, domain logic, DTOs, and comprehensive test coverage; includes tee time calculations, group assignments, hole-based starts, and REST API endpoints
- **Domain-Driven Design**: Events module demonstrates layered architecture with domain logic separated from infrastructure
- **Testing Infrastructure**: Set up Jest with proper TypeScript support and type-safe test patterns

### Technical

- **Layered architecture**: Domain logic separated from infrastructure (events module pattern)
- **Type-safe testing**: Jest configured with `Partial<T>` patterns for service mocks
- **Domain type usage**: Tests use actual domain types (`EventDomainData`, `RegistrationSlotDomainData`) instead of `any`

## [0.2.0] - 2025-11-03

### Added

- **JWT Authentication Flow**: Complete end-to-end authentication between Next.js (Better Auth) and NestJS API; implemented JWT token re-signing pattern (EdDSA → HS256) with shared secret validation; created API route proxy for session-to-token conversion
- **Better Auth Integration**: Configured Better Auth in Next.js with SQLite persistence, JWT plugin, and secure session management; implemented server-side authentication validation
- **Drizzle ORM Integration**: Installed drizzle-orm@0.44.7 and mysql2@3.15.3, configured connection pooling with DATABASE_URL env variable, created complete database schema and relations for events, courses, registration, scores, and auth tables
- **Frontend-Backend Integration**: Established working API connectivity with authenticated requests; updated Golf Genius page to use shared `EventDto` types and real API calls instead of mock data
- **Shared DTO Package**: Created and integrated packages/dto with type-safe DTOs for events, scores, and registration; built with TypeScript and consumed via workspace imports

### Technical

- **JWT Token Re-signing Pattern**: Better Auth generates EdDSA tokens (asymmetric) for client security, Next.js API route converts to HS256 tokens (symmetric) for backend validation using shared secret; provides clean security boundary between public and internal authentication
- **Server-Side Authentication Bridge**: Next.js API routes act as authentication proxies that validate Better Auth sessions, generate appropriate JWT tokens, and forward authenticated requests to backend APIs with proper authorization headers
- **Database separation**: MySQL for domain data via Drizzle, SQLite for auth/session data (lightweight, file-backed)

## [0.1.0] - 2025-11-02

### Added

- **Monorepo Setup**: Initialized pnpm workspace with Turbo, created workspace folders (`apps/api`, `apps/web`, `packages/dto`, `docker`), configured `pnpm-workspace.yaml`, `turbo.json`, and `docker-compose.yml`
- **Memory Bank**: Created comprehensive documentation system with all core files (`projectBrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`)
- **NestJS API Foundation**: Scaffolded NestJS app with TypeScript, health endpoint, and JWT authentication guard
- **Database Layer**: Created DrizzleService with connection pooling and complete schema definitions
- **Containerization**: Databases run in Docker (docker-compose) for environment parity and reproducible local dev
- **Dev workflow**: `pnpm` workspaces + Turbo for caching and task orchestration; `docker-compose up` brings up databases
