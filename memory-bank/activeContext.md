# Active Context

Current focus:

- Complete the NestJS API implementation with full module coverage (events, courses, registration, scores)
- Implement Next.js frontend with better-auth integration and daisyUI components
- Establish end-to-end connectivity between API and web app
- API module barrel exports completed - all major modules now have clean public APIs

Recent changes:

- **TanStack Table Integration for Event Reports**: Pivoted event report page from server-side sorting/filtering to client-side using @tanstack/react-table; removed backend filter/sort logic, fetch full dataset once, enable client-side sorting (team/GHIN/age/fullName), global fuzzy search, and pagination (10/25/50/100 rows); maintains default team ascending sort on load; improves responsiveness for <1000 rows
- **Golf Genius Integration Completion**: Finalized comprehensive Golf Genius integration module with all core endpoints implemented; moved closeEvent endpoint to golfgenius module with proper integration logging; fixed LogIntegrationInterceptor to handle both `id` and `eventId` parameters and correctly extract event IDs for audit logging
- **Team Tournament Results Import**: Implemented complete team results import functionality with blind draw exclusion; added "Import Team Results" action to integration workflow, created team-specific parser and service logic, implemented team name parsing to identify blind players using "Bl[firstname lastname]" pattern, and added tracking for skipped blind players in import summaries
- **Blind Draw Exclusion Logic**: Added business rule to skip blind draws from tournament payouts; parses team names to extract blind player names, matches against registered players using full name comparison, skips blind players from tournamentResult record creation while logging exclusions, and tracks skipped count in import results
- **Team Results API Route**: Created Next.js proxy route `/api/golfgenius/events/[id]/import-team-results` to handle team-specific result imports with proper authentication and SSE streaming support
- **Per-Player Progress Emissions**: Completed implementation of per-player progress callbacks for all 4 Golf Genius results import methods (points, skins, proxy, stroke); updated `processResults` method to accept optional `onPlayerProcessed` callback, modified player processing loop to emit progress after each player, and updated all format-specific processor methods to pass through the callback parameter
- **SSE Roster Export Fix**: Resolved "Connection lost" issue by implementing streaming-first architecture; eliminated race condition between export initialization and SSE connection by returning RxJS Subject synchronously while processing export asynchronously in background; simplified frontend to use single SSE endpoint that auto-starts export
- **Type Safety Improvements**: Completed comprehensive type safety enhancements for GolfGenius results import service including discriminated union types for tournament aggregates, proper API response types replacing `any`, circular dependency resolution with barrel file exports, and VS Code settings updates to prevent auto-removal of imports
- **Commit Policy Rule**: Added `.clinerules/commit-policy.md` requiring explicit user approval before any git commits to prevent accidental commits of incomplete or untested changes
- **Roster Export Fixes**: Implemented parallel processing for roster export operations, fixed TypeScript type issues in roster-export.service.ts, added proper types for processSinglePlayer parameters, improved result aggregation method typing, and fixed getEventRoster to unwrap Golf Genius API member objects before mapping
- **JWT Authentication Implementation**: Complete end-to-end authentication flow between Next.js (Better Auth) and NestJS API; implemented JWT token re-signing pattern where EdDSA tokens from Better Auth are converted to HS256 tokens for backend validation using shared secret
- **API Route Proxy**: Created `apps/web/app/api/events/search/route.ts` as server-side authentication bridge that validates sessions, generates JWT tokens, and proxies requests to backend API with proper authorization headers
- **Backend JWT Guard**: Modified `apps/api/src/auth/jwt.guard.ts` to validate HS256 JWT tokens using `jsonwebtoken` library with shared secret validation
- **Golf Genius Frontend Integration**: Updated golf-genius page to use `EventDto` from shared `@repo/dto` package and call real API endpoint instead of mock data; removed `TournamentEvent` interface in favor of shared types
- **Better Auth Configuration**: Enabled JWT plugin in Next.js app with EdDSA algorithm for secure client-side tokens; configured shared JWT secret for cross-service authentication
- **Drizzle ORM Integration**: Installed drizzle-orm@0.44.7 and mysql2@3.15.3, configured connection pooling with DATABASE_URL env variable, created complete database schema and relations for events, courses, registration, scores, and auth tables
- **Events Module Implementation**: Built complete events module with service, controller, domain logic, DTOs, and comprehensive test coverage; includes tee time calculations, group assignments, and hole-based starts
- **Golf Genius Integration Module**: Complete bidirectional integration with Golf Genius API v2 including event sync, member roster sync, roster export, scores import, and comprehensive error handling with retry logic and rate limiting
- **Tournament Results Import**: Implemented comprehensive TypeScript solution for importing Golf Genius tournament results with format-specific parsers (points, skins, proxy, stroke play); includes flexible DTOs, result parsers with ordinal logic, service skeleton, controller endpoints, and comprehensive unit tests
- **Close Event Feature**: Added POST /events/:eventId/close endpoint that updates all tournament result payoutStatus to "Confirmed" and payoutDate to current timestamp; includes comprehensive validation (event must have tournaments and results, cannot be already closed) and proper error handling
- **Golf Genius Integration Orchestrator UI**: Implemented linear stepper workflow with 3 phases (Setup, Import Results, Finalize); phase progression driven by integration logs with automatic state derivation; displays event context as "{start date}: {event name}"
- **Action-to-Endpoint Mapping**: Created centralized mapping system in `apps/web/lib/integration-actions.ts` that maps all 8 IntegrationActionName values to backend endpoints with type-safe helper functions
- **Dynamic API Proxy Route**: Single dynamic route `/api/golfgenius/events/[id]/[action]` handles all integration actions through Next.js API proxy with validation and authentication
- **Real Integration Action Execution**: Updated IntegrationActionCard with live API calls, loading states, error handling, and automatic log refresh on completion; added onComplete callback pattern for parent-child communication
- **Phase-Based Workflow**: Three-phase orchestration (Setup → Import Results → Finalize) with smart gating, sequential requirements, numbered action indicators, and phase navigation controls

Important decisions & constraints:

- **Domain-Driven Design**: Events module uses domain layer with pure business logic, separated from infrastructure concerns
- **Type Safety**: Strict TypeScript usage with no `any` types in production code; test files use proper domain types
- **Database Separation**: MySQL for domain data via Drizzle, SQLite for auth via better-auth
- **Shared Types**: DTO package enforces consistent payloads across API and web app
- **Containerization**: All databases run in Docker for development parity

Recent learnings:

- **SSE Streaming Architecture**: Streaming-first pattern eliminates race conditions in real-time operations; return RxJS Subject synchronously from service methods while processing work asynchronously in background; frontend connects immediately to established stream rather than waiting for operation initialization
- **Race Condition Prevention**: Two-step async operations (initiate → connect) create timing issues; single-step synchronous stream establishment with async processing provides reliable real-time communication
- **Golf Genius API Behavior**: Inconsistent response wrapping patterns - seasons/events/rounds wrapped in nested objects, tournaments wrapped in `event` property (not `tournament`), defensive unwrapping required: `item.wrapper || item`
- **Drizzle ORM Datetime Handling**: Schema `mode: "date"` expects Date objects (calls `.toISOString()`), `mode: "string"` expects strings; MySQL rejects ISO 8601 format with `T`/`Z` when using string mode
- **Integration Logging**: Enhanced error logging revealed actual MySQL errors masked by generic Drizzle messages; datetime conversion from ISO string to Date object required for proper database insertion

Notes for future work:

- Migration strategy uses Drizzle with no schema ownership (external database)
- Authentication flow: better-auth in Next.js → JWT validation in NestJS API
- Golf Genius API integration requires defensive unwrapping patterns for all endpoints
