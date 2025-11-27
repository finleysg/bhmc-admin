# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha.1] - 2025-11-11

### Added

- **Golf Genius Integration Module Completion**: Finalized comprehensive Golf Genius integration with all core endpoints implemented including roster sync, event sync, roster export, scores import, tournament results import (points/skins/proxy/stroke/team), and close event functionality
- **Close Event Endpoint**: Moved closeEvent endpoint from events module to golfgenius module at `/golfgenius/events/:eventId/close` with proper integration logging and interceptor support
- **Integration Logging Interceptor**: Enhanced LogIntegrationInterceptor to handle both `id` and `eventId` parameter names, added explicit "Close Event" action detection, and fixed event ID extraction for proper audit logging

### Changed

- **Endpoint Relocation**: Close event functionality moved from `/events/:eventId/close` to `/golfgenius/events/:eventId/close` to align with Golf Genius integration patterns
- **Integration Action Names**: Added "Close Event" to IntegrationActionName type and interceptor detection logic

### Fixed

- **Foreign Key Constraint in Integration Logs**: Resolved database insertion errors in `core_golfgeniusintegrationlog` table by fixing event ID extraction in LogIntegrationInterceptor (was defaulting to 0, now correctly extracts from request parameters)

### Technical

- **Module Architecture**: Golf Genius integration now fully self-contained with dedicated controller, services, interceptors, and DTOs
- **Type Safety**: Maintained strict TypeScript compliance with proper error handling and integration logging
- **API Consistency**: All Golf Genius endpoints follow consistent patterns with interceptor-based logging and error handling

## [0.3.0-alpha.1] - 2025-11-13

### Added

- **Points Report Implementation**: Complete end-to-end points report with backend database joins (tournamentPoints + tournament + player tables), frontend TanStack Table with sorting/filtering/pagination, Excel export, and API proxy routes; displays tournament name, position, full name, GHIN, score, points, type (Gross/Net), and details with default tournament name + position sorting; follows event report patterns for consistency
- **TanStack Table Integration for Event Reports**: Pivoted event report page from server-side sorting/filtering to client-side using @tanstack/react-table; removed backend filter/sort logic, fetch full dataset once, enable client-side sorting (team/GHIN/age/fullName), global fuzzy search, and pagination (10/25/50/100 rows); maintains default team ascending sort on load; improves responsiveness for <1000 rows
- **Excel Export for Event Reports**: Implemented server-side Excel export functionality using ExcelJS library; added generateEventReportExcel method to reports service, new /reports/events/:eventId/event-report/excel endpoint, proxy route in web app, and "Export to Excel" button in event report page; exports full dataset with all columns (fixed fields + dynamic fees) to .xlsx file with styled headers and auto-width columns
- **Golf Genius Integration Completion**: Finalized comprehensive Golf Genius integration module with all core endpoints implemented; moved closeEvent endpoint to golfgenius module with proper integration logging; fixed LogIntegrationInterceptor to handle both `id` and `eventId` parameters and correctly extract event IDs for audit logging
- **Team Tournament Results Import**: Implemented complete team results import functionality with blind draw exclusion; added "Import Team Results" action to integration workflow, created team-specific parser and service logic, implemented team name parsing to identify blind players using "Bl[firstname lastname]" pattern, and added tracking for skipped blind players in import summaries
- **Blind Draw Exclusion Logic**: Added business rule to skip blind draws from tournament payouts; parses team names to extract blind player names, matches against registered players using full name comparison, skips blind players from tournamentResult record creation while logging exclusions, and tracks skipped count in import results
- **Team Results API Route**: Created Next.js proxy route `/api/golfgenius/events/[id]/import-team-results` to handle team-specific result imports with proper authentication and SSE streaming support
- **Per-Player Progress Emissions**: Completed implementation of per-player progress callbacks for all 4 Golf Genius results import methods (points, skins, proxy, stroke); updated `processResults` method to accept optional `onPlayerProcessed` callback, modified player processing loop to emit progress after each player, and updated all format-specific processor methods to pass through the callback parameter
- **SSE Roster Export Fix**: Resolved "Connection lost" issue by implementing streaming-first architecture; eliminated race condition between export initialization and SSE connection by returning RxJS Subject synchronously while processing export asynchronously in background; simplified frontend to use single SSE endpoint that auto-starts export
- **Type Safety Improvements**: Completed comprehensive type safety enhancements for GolfGenius results import service including discriminated union types for tournament aggregates, proper API response types replacing `any`, circular dependency resolution with barrel file exports, and VS Code settings updates to prevent auto-removal of imports

### Technical

- **Reports Module Completion**: Full implementation of points report with backend database joins, frontend table integration, and Excel export functionality
- **Golf Genius Integration Finalization**: All core endpoints implemented and tested with comprehensive error handling and logging
- **Type Safety Enhancements**: Advanced TypeScript patterns including discriminated unions, type guards, and proper API response handling

## [0.4.0-alpha.1] - 2025-11-13

### Added

- **Finance Report Implementation**: Complete event-specific finance report with money flow tracking; aggregates payments, refunds, and tournament payouts by bucket (Credit, Cash, Passthru); includes net calculations, format-specific payout breakdowns, Excel export, and API endpoints; handles proportional refund allocation across fee types with comprehensive database joins and type-safe DTOs

## [0.6.0] - 2025-11-16

### Added

- **Unit Testing Expansion**: Added comprehensive Jest tests for domain package (48 tests covering player, registration, time utilities) and API Excel utilities (12 tests); configured root-level test orchestration with Turbo; eliminated ts-jest deprecation warnings and TypeScript compiler warnings

### Technical

- **Jest Configuration**: Updated Jest configs to use modern `transform` syntax instead of deprecated `globals`; added `isolatedModules: true` to TypeScript configs for ESM compatibility
- **Test Coverage**: Achieved comprehensive unit test coverage for pure functions and utilities across domain and API packages

## [0.7.0] - 2025-11-18

### Added

- **Event Existence Check**: Added lightweight `existsById` method to EventsRepository using count query to avoid entity hydration; implemented service `exists` method through EventsService

## [Unreleased]

### Added

- **Reserve Admin Slots Endpoint**: Added POST `/:eventId/reserve-admin-slots` endpoint for administrative slot reservation; accepts array of slot IDs in request body; creates empty registration record and updates slots to pending status in transaction; validates all slots are available before reservation; returns new registration ID
- **Transaction Fee Calculation**: Added `calculateTransactionFee` domain function implementing Stripe-like fee calculation (2.9% + $0.30); returns 0 for $0 payments; integrated into `completeAdminRegistration` service to automatically calculate fees when `collectPayment` is true; added comprehensive test suite with edge cases and floating point precision handling

### Changed

- **Commit Policy Enforcement**: Updated `.clinerules/commit-policy.md` to require all commits to go through the `/commit-task.md` workflow; discourages manual `git add`/`git commit` commands outside the workflow; ensures comprehensive quality checks and documentation updates before committing

- **Purse Amount Handling Refactor**: Unified purse amount logic across all tournament result import methods (points/skins/proxy/stroke/team/quota) to exit early on null/0/empty values without logging errors; removed redundant preliminary checks and error messages; updated `parsePurseAmount` to handle undefined/null values gracefully; ensures consistent business rule that tournament results are only saved when players have won actual money

- **Type Error Fixes After Domain Package Migration**: Resolved 20 TypeScript compilation errors after moving types to domain package; updated import statements across 9 files in API package to use centralized `@repo/domain/types`; fixed NestJS decorator compatibility with type-only imports (`import type`) for `emitDecoratorMetadata` settings; resolved missing type issues in Golf Genius integration service by proper import consolidation
- **Events Service Domain Conversion**: Completed toEvent mapper to return full domain Event objects with all child models (courses with holes, eventFees, eventRounds, tournaments); updated toCourse mapper for holes population; fixed method name typo in service and dependent code; decoupled service from EventModel to use domain Event type
- **Domain Event Validation Function**: Created `validateClubEvent` domain function with CompleteClubEvent type for validating ClubEvent objects; supports conditional Golf Genius field exclusion with `excludeGolfGenius` parameter; returns CompleteClubEvent for default validation passes, original ClubEvent for exclude mode passes, or null for validation failures; includes comprehensive Jest test coverage for all validation scenarios and edge cases

### Changed

- **Package Rename**: Renamed `packages/dto` to `packages/domain` to better align with domain-driven design principles; updated all workspace dependencies, imports, and documentation accordingly; maintained full type safety and build compatibility

### Added

- **Event Results Report Implementation**: Complete end-to-end Event Results report with three sections (stroke play, skins, proxies) and empty row separators between sections; backend database queries with format-specific filtering (stroke excludes "Overall" tournaments, skins uses position for "skins won", proxies shows single winner); frontend hierarchical table rendering with section headers and sub-sections; Excel export with proper section formatting and empty rows; API proxy routes for JSON and Excel endpoints; follows established patterns with type-safe DTOs and error handling
- **Event-Specific Player Search**: Implemented GET /registration/:eventId/players endpoint for searching registered players in a specific event; supports optional text search on firstName, lastName, ghin; optional includeGroup parameter to include full RegisteredGroupDto with course and slots; uses Drizzle ORM with inner joins and type-safe DTOs

- **Excel Export for Event Reports**: Implemented server-side Excel export functionality using ExcelJS library; added generateEventReportExcel method to reports service that creates .xlsx files with all event report columns (fixed fields + dynamic fees), styled headers, and auto-width columns; added new /reports/events/:eventId/event-report/excel endpoint with proper content-type headers; created Next.js proxy route and "Export to Excel" button in event report page for seamless download
- **Stroke Play Overall Tournament Skip Logic**: Added special handling to skip stroke play tournaments named "Overall" during results import as they have no associated results; implemented filtering in both streaming and non-streaming import methods with logging and progress emission for skipped tournaments
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

### Refactored

- **API Proxy Routes**: Extended `fetchWithAuth` utility to support binary responses (Excel downloads); eliminated ~160 lines of duplicated authentication logic across Excel proxy routes; unified auth handling for all report proxies (JSON + binary)
- **Report Pages**: Created shared hooks (`useAuthenticatedFetch`, `useExcelExport`) and `ReportPage` wrapper component; reduced page duplication by ~50%; improved consistency in loading/error states, authentication, and Excel export functionality; maintained TanStack Table features in Points report while unifying UI patterns

### Changed

- **Event Report Sorting**: Restored default sort in getEventReport to sort by teamId ascending
- **Event Report UI**: Removed row number column from event report table and added record count display in report title
- **Event Report Table**: Migrated to TanStack Table (React Table v8) with advanced features including sortable columns, global search/filtering, pagination, and responsive design
- **Golf Genius Page**: Replaced static action cards with dynamic IntegrationOrchestrator component
- **IntegrationActionCard**: Added onComplete callback prop and real API execution instead of placeholder alerts

### Fixed

- **Invalid IntegrationActionName Usage**: Fixed `ImportAllResultsService` error handling to use valid IntegrationActionName "Import Results" instead of invalid "Import All Results" with type casting; ensures consistent action naming in logs and UI orchestrator
- **Quota Tournament Documentation Inconsistency**: Fixed discrepancy between code and documentation - quota format is fully implemented in service but was documented as "Not Implemented"; updated flow diagram and added detailed documentation about quota tournament format and expected fields
- **Event Report Infinite Re-render**: Fixed "Maximum update depth exceeded" error in event report page by moving `fixedColumnDefs` object outside component to prevent re-creation on every render; eliminated useEffect dependency changes that caused infinite loops
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
