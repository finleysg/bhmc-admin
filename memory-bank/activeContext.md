# Active Context

Current focus:

- Maintain and enhance testing infrastructure; ensure comprehensive coverage for pure functions and utilities
- Monitor and update memory bank documentation to reflect recent changes and testing efforts

Recent changes:

- **11/26/2025: Implemented MailModule with React Email integration** Added complete email system with MailService using Nodemailer SMTP transport, React Email templates (welcome email with professional styling), proper TypeScript types (@types/react installed), JSX support in API tsconfig, mail configuration in .env.example, and clean service interface for other modules to send HTML emails
- **11/26/2025: Implemented transaction fee calculation for admin registration completion** Added `calculateTransactionFee` domain function using Stripe-like formula (2.9% + $0.30), returns 0 for $0 payments; updated `completeAdminRegistration` to calculate fees when `collectPayment` is true; added comprehensive test suite with edge cases
- **11/26/2025: Implemented admin slot reservation endpoint** Added POST `/:eventId/reserve-admin-slots` endpoint for administrative slot reservation; accepts array of slot IDs in request body; creates empty registration record and updates slots to pending status in transaction; validates all slots are available before reservation; returns new registration ID
- **11/26/2025: Implemented available-slots endpoint** Added GET `/registration/:eventId/available-slots?courseId=123&players=2` endpoint to return slot groups with sufficient available slots for requested player count; created `AvailableSlotGroup` type, repository method to query available slots by event and course, service method to group slots by holeId and startingOrder with filtering logic, and controller endpoint with proper parameter parsing
- **11/21/2025: Implemented "Import Low Scores" feature** Completed backend `LowScoresImportService` for calculating and storing season-long low scores per course (Gross/Net), added idempotency with `existsLowScore` checks to prevent duplicates, updated UI orchestration with Phase 3 action, enhanced `LogIntegrationInterceptor` to recognize the new `/api/golfgenius/events/:eventId/import-low-scores` endpoint, and fixed data integrity issues for tie scenarios
- **11/21/2025 (Bug Fix): Fixed invalid IntegrationActionName usage** in `ImportAllResultsService` error handling - changed "Import All Results" (invalid) to "Import Results" (valid) and removed type casting to ensure consistent action naming in logs and UI orchestrator
- **11/21/2025 (Documentation Fix): Resolved quota tournament documentation inconsistency** - quota format was documented as "Not Implemented" but is fully functional in service with complete DTOs, parser, and processor logic; updated mermaid flow diagram and added detailed documentation about quota tournament behavior and expected fields
- **11/21/2025: Enhanced Golf Genius tournament format detection** by implementing `score_scope` logic in `mapTournament` function to distinguish "team" vs "stroke" formats based on Golf Genius API attribute; added comprehensive unit tests with full coverage
- **11/20/2025: Refactored purse amount handling logic** in import-all-results.service.ts across all tournament format methods to exit early on 0/null/empty values without logging errors; removed redundant checks and unified logic: no money = no record saved = no error logged; updated parsePurseAmount parameter type to handle undefined/null values
- **11/18/2025: Created validateClubEvent domain function** with CompleteClubEvent type for ClubEvent validation, supporting GolfGenius field exclusion and type narrowing
- **11/18/2025: Updated systemPatterns.md "Code organization patterns" section** to better reflect current solution state, adding details on web app structure (Next.js app router), domain package organization, integration module patterns (e.g., golfgenius subfolders), and refined barrel exports across apps/packages.
- **Points Report Implementation**: Complete end-to-end points report with backend database joins (tournamentPoints + tournament + player), frontend TanStack Table with sorting/filtering/pagination, Excel export, and API proxy routes; displays tournament name, position, full name, GHIN, score, points, type (Gross/Net), and details with default tournament name + position sorting; follows event report patterns for consistency
- **TanStack Table Integration for Event Reports**: Pivoted event report page from server-side sorting/filtering to client-side using @tanstack/react-table; removed backend filter/sort logic, fetch full dataset once, enable client-side sorting (team/GHIN/age/fullName), global fuzzy search, and pagination (10/25/50/100 rows); maintains default team ascending sort on load; improves responsiveness for <1000 rows
- **Excel Export for Event Reports**: Implemented server-side Excel export functionality using ExcelJS library; added generateEventReportExcel method to reports service, new /reports/events/:eventId/event-report/excel endpoint, proxy route in web app, and "Export to Excel" button in event report page; exports full dataset with all columns (fixed fields + dynamic fees) to .xlsx file with styled headers and auto-width columns

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
