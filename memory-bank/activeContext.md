# Active Context

Current focus:

- Maintain and enhance testing infrastructure; ensure comprehensive coverage for pure functions and utilities
- Monitor and update memory bank documentation to reflect recent changes and testing efforts

Recent changes:

- **Unit Testing Expansion**: Added comprehensive Jest tests for domain package (48 tests covering player, registration, time utilities) and API Excel utilities (12 tests); configured root-level test orchestration with Turbo; eliminated ts-jest deprecation warnings and TypeScript compiler warnings
- **Registration Domain Refactoring**: Moved all domain functions and tests from `apps/api/src/registration/domain/` to shared `packages/domain/src/register/domain/` package; deleted DomainData interfaces (PlayerDomainData, EventDomainData, etc.) and replaced all usages with existing DTOs (PlayerDto, EventDto, etc.); updated mappers to output DTOs instead of domain types; maintained pure business logic while eliminating type duplication; updated all API app imports to use shared package exports
- **Event-Specific Player Search**: Implemented GET /registration/:eventId/players endpoint for searching registered players in a specific event; supports optional text search on firstName, lastName, ghin; optional includeGroup parameter to include full RegisteredGroupDto with course and slots; uses Drizzle ORM with inner joins and type-safe DTOs
- **Finance Report Implementation**: Complete event-specific finance report with money flow tracking; aggregates payments, refunds, and tournament payouts by bucket (Credit, Cash, Passthru); includes net calculations, format-specific payout breakdowns, Excel export, and API endpoints; handles proportional refund allocation across fee types with comprehensive database joins
- **Event Results Report Implementation**: Complete end-to-end Event Results report with three sections (stroke play, skins, proxies) and empty row separators; backend queries tournamentResult + tournament + player tables with format-specific filtering and sorting; frontend hierarchical table rendering with section headers and sub-sections; Excel export with proper section formatting; API proxy routes for JSON and Excel endpoints; stroke tournaments exclude "Overall", skins use position for "skins won", proxies show single winner per tournament
- **Points Report Implementation**: Complete end-to-end points report with backend database joins (tournamentPoints + tournament + player), frontend TanStack Table with sorting/filtering/pagination, Excel export, and API proxy routes; displays tournament name, position, full name, GHIN, score, points, type (Gross/Net), and details with default tournament name + position sorting; follows event report patterns for consistency
- **TanStack Table Integration for Event Reports**: Pivoted event report page from server-side sorting/filtering to client-side using @tanstack/react-table; removed backend filter/sort logic, fetch full dataset once, enable client-side sorting (team/GHIN/age/fullName), global fuzzy search, and pagination (10/25/50/100 rows); maintains default team ascending sort on load; improves responsiveness for <1000 rows
- **Excel Export for Event Reports**: Implemented server-side Excel export functionality using ExcelJS library; added generateEventReportExcel method to reports service, new /reports/events/:eventId/event-report/excel endpoint, proxy route in web app, and "Export to Excel" button in event report page; exports full dataset with all columns (fixed fields + dynamic fees) to .xlsx file with styled headers and auto-width columns
- **Golf Genius Integration Completion**: Finalized comprehensive Golf Genius integration module with all core endpoints implemented; moved closeEvent endpoint to golfgenius module with proper integration logging; fixed LogIntegrationInterceptor to handle both `id` and `eventId` parameters and correctly extract event IDs for audit logging
- **Team Tournament Results Import**: Implemented complete team results import functionality with blind draw exclusion; added "Import Team Results" action to integration workflow, created team-specific parser and service logic, implemented team name parsing to identify blind players using "Bl[firstname lastname]" pattern, and added tracking for skipped blind players in import summaries
- **Blind Draw Exclusion Logic**: Added business rule to skip blind draws from tournament payouts; parses team names to extract blind player names, matches against registered players using full name comparison, skips blind players from tournamentResult record creation while logging exclusions, and tracks skipped count in import results
- **Team Results API Route**: Created Next.js proxy route `/api/golfgenius/events/[id]/import-team-results` to handle team-specific result imports with proper authentication and SSE streaming support
- **Per-Player Progress Emissions**: Completed implementation of per-player progress callbacks for all 4 Golf Genius results import methods (points, skins, proxy, stroke); updated `processResults` method to accept optional `onPlayerProcessed` callback, modified player processing loop to emit progress after each player, and updated all format-specific processor methods to pass through the callback parameter

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
