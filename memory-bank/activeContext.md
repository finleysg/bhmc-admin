# Active Context

Current focus:

- Implement drop and refund functionality with Stripe integration for player withdrawals
- Maintain and enhance testing infrastructure; ensure comprehensive coverage for pure functions and utilities
- Monitor and update memory bank documentation to reflect recent changes and testing efforts

Recent changes:

- **12/2/2025: Implemented drop and refund support with Stripe integration**
  - Added Stripe module and service for payment processing and refund handling
  - Updated registration system to handle player drops and refund calculations
  - Modified fee calculation utilities for drop scenarios and refund processing
  - Updated domain types to include RefundRequest functionality
  - Enhanced player drop UI components with fee handling and refund options
  - All changes passed formatting, linting, build, and test checks

- **11/30/2025: Added SelectPlayers component, drop reducer, and tests**
  - Created `select-players.tsx` for player selection UI in event player management
  - Updated `group-search.tsx` for new selection logic
  - Added `drop/reducer.ts` and `drop/__tests__/reducer.test.ts` for drop functionality
  - Updated `drop/page.tsx` to integrate new reducer
  - Updated domain logic in `registration-validation.ts`
  - Minor update to registration groups search API route
  - Passed formatting, linting, build, and test checks; committed on feature/select-players-component branch

- **11/30/2025: Created GroupSearch component for event player management** Built new GroupSearch React component for searching player groups in events; added supporting API route and backend logic; updated registration controller, repository, and service for group search; improved registration validation and tests to allow optional player and fees; passed all formatting, linting, build, and test checks.
- **11/30/2025: Added findGroups endpoint for registration search** Implemented `findGroups(eventId, searchText)` service and controller endpoint to return all CompleteRegistration objects for an event where any related player's first or last name matches the search text; added repository method for efficient registration ID querying by player name; updated controller, service, and repository files; passed all formatting, linting, build, and test checks.
- **11/29/2025: Refactored Player Registration Flow** Refactored the "Add Player" workflow by creating a `ReserveSpot` component to encapsulate reservation logic and an `AdminRegistrationOptions` component for post-reservation details; updated the main page to orchestrate the new components; added necessary API proxy routes for `reserve` and `admin-registration` endpoints.
- **11/29/2025: Added reducer and tests for Add Player workflow** Created `reducer.ts` and `reducer.test.ts` for the Add Player workflow; updated configs (`jest.config.ts`, `package.json`, `tsconfig.json`) to support enhanced testing and workflow; improved encapsulation and orchestration of reservation and registration options.
- **11/28/2025: Integrated Fee Selection into Manual Registration** Implemented `EventFeePicker` and `PlayerEventFeePicker` components with DaisyUI styling; integrated these into the `AddPlayerPage` to allow admins to select fees for players; updated domain types (`EventFee`, `Payment`, `Refund`) for better type safety; enhanced `calculateTransactionFee` to handle complex fee scenarios; updated API events service to persist fee selection during registration
- **11/27/2025: Integrated SelectAvailable component with dropdown and badge UI** Created SelectAvailable component with course selection and slot availability; implemented dropdown UI for slot selection using getStart domain function for proper tee time/hole naming; added removable badge display for selected starting times/holes with clear selection functionality; created API proxy route for available slots endpoint; updated AddPlayerPage to conditionally render slot selection based on event.canChoose logic; integrated with domain types and proper TypeScript validation
- **11/27/2025: Set up GitHub MCP server and enhanced player registration UI** Configured GitHub MCP server with Docker setup for comprehensive GitHub API access (repos, issues, PRs, CI/CD, security tools); implemented player search component with Headless UI combobox for improved user experience; created registration API endpoint for player management; updated player add page with enhanced search and registration flow; added usehooks-ts and @headlessui/react dependencies; removed unused mermaid.md configuration file
- **11/26/2025: Implemented MailModule with React Email integration** Added complete email system with MailService using Nodemailer SMTP transport, React Email templates (welcome email with professional styling), proper TypeScript types (@types/react installed), JSX support in API tsconfig, mail configuration in .env.example, and clean service interface for other modules to send HTML emails
- **11/26/2025: Implemented transaction fee calculation for admin registration completion** Added `calculateTransactionFee` domain function using Stripe-like formula (2.9% + $0.30), returns 0 for $0 payments; updated `completeAdminRegistration` to calculate fees when `collectPayment` is true; added comprehensive test suite with edge cases
- **11/26/2025: Implemented admin slot reservation endpoint** Added POST `/:eventId/reserve-admin-slots` endpoint for administrative slot reservation; accepts array of slot IDs in request body; creates empty registration record and updates slots to pending status in transaction; validates all slots are available before reservation; returns new registration ID
- **11/26/2025: Implemented available-slots endpoint** Added GET `/registration/:eventId/available-slots?courseId=123&players=2` endpoint to return slot groups with sufficient available slots for requested player count; created `AvailableSlotGroup` type, repository method to query available slots by event and course, service method to group slots by holeId and startingOrder with filtering logic, and controller endpoint with proper parameter parsing
- **11/21/2025: Implemented "Import Low Scores" feature** Completed backend `LowScoresImportService` for calculating and storing season-long low scores per course (Gross/Net), added idempotency with `existsLowScore` checks to prevent duplicates, updated UI orchestration with Phase 3 action, enhanced `LogIntegrationInterceptor` to recognize the new `/api/golfgenius/events/:eventId/import-low-scores` endpoint, and fixed data integrity issues for tie scenarios
- **11/21/2025 (Bug Fix): Fixed invalid IntegrationActionName usage** in `ImportAllResultsService` error handling - changed "Import All Results" (invalid) to "Import Results" (valid) and removed type casting to ensure consistent action naming in logs and UI orchestrator

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
