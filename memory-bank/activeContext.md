# Active Context

Current focus:

- Maintain and enhance testing infrastructure; ensure comprehensive coverage for pure functions and utilities
- Monitor and update memory bank documentation to reflect recent changes and testing efforts

Recent changes:

- **11/21/2025 (Bug Fix): Fixed invalid IntegrationActionName usage** in `ImportAllResultsService` error handling - changed "Import All Results" (invalid) to "Import Results" (valid) and removed type casting to ensure consistent action naming in logs and UI orchestrator
- **11/21/2025: Enhanced Golf Genius tournament format detection** by implementing `score_scope` logic in `mapTournament` function to distinguish "team" vs "stroke" formats based on Golf Genius API attribute; added comprehensive unit tests with full coverage
- **11/20/2025: Refactored purse amount handling logic** in import-all-results.service.ts across all tournament format methods to exit early on 0/null/empty values without logging errors; removed redundant checks and unified logic: no money = no record saved = no error logged; updated parsePurseAmount parameter type to handle undefined/null values
- **11/18/2025: Created validateClubEvent domain function** with CompleteClubEvent type for ClubEvent validation, supporting GolfGenius field exclusion and type narrowing
- **11/18/2025: Updated systemPatterns.md "Code organization patterns" section** to better reflect current solution state, adding details on web app structure (Next.js app router), domain package organization, integration module patterns (e.g., golfgenius subfolders), and refined barrel exports across apps/packages.
- **Points Report Implementation**: Complete end-to-end points report with backend database joins (tournamentPoints + tournament + player), frontend TanStack Table with sorting/filtering/pagination, Excel export, and API proxy routes; displays tournament name, position, full name, GHIN, score, points, type (Gross/Net), and details with default tournament name + position sorting; follows event report patterns for consistency
- **TanStack Table Integration for Event Reports**: Pivoted event report page from server-side sorting/filtering to client-side using @tanstack/react-table; removed backend filter/sort logic, fetch full dataset once, enable client-side sorting (team/GHIN/age/fullName), global fuzzy search, and pagination (10/25/50/100 rows); maintains default team ascending sort on load; improves responsiveness for <1000 rows
- **Excel Export for Event Reports**: Implemented server-side Excel export functionality using ExcelJS library; added generateEventReportExcel method to reports service, new /reports/events/:eventId/event-report/excel endpoint, proxy route in web app, and "Export to Excel" button in event report page; exports full dataset with all columns (fixed fields + dynamic fees) to .xlsx file with styled headers and auto-width columns
- **Team Tournament Results Import**: Implemented complete team results import functionality with blind draw exclusion; added "Import Team Results" action to integration workflow, created team-specific parser and service logic, implemented team name parsing to identify blind players using "Bl[firstname lastname]" pattern, and added tracking for skipped blind players in import summaries
- **Blind Draw Exclusion Logic**: Added business rule to skip blind draws from tournament payouts; parses team names to extract blind player names, matches against registered players using full name comparison, skips blind players from tournamentResult record creation while logging exclusions, and tracks skipped count in import results
- **Team Results API Route**: Created Next.js proxy route `/api/golfgenius/events/[id]/import-team-results` to handle team-specific result imports with proper authentication and SSE streaming support
- **Per-Player Progress Emissions**: Completed implementation of per-player progress callbacks for all 4 Golf Genius results import methods (points, skins, proxy, stroke); updated `processResults` method to accept optional `onPlayerProcessed` callback, modified player processing loop to emit progress after each player, and updated all format-specific processor methods to pass through the callback parameter
- **Events Service Domain Conversion**: Completed toEvent mapper to return full domain Event objects with all child models (courses with holes, eventFees, eventRounds, tournaments); updated toCourse mapper for holes population; fixed method name typo in service and dependent code; decoupled service from EventModel to use domain Event type
- **SSE Roster Export Fix**: Resolved "Connection lost" issue by implementing streaming-first architecture; eliminated race condition between export initialization and SSE connection by returning RxJS Subject synchronously while processing export asynchronously in background; simplified frontend to use single SSE endpoint that auto-starts export

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
