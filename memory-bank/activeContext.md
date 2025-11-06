# Active Context

Current focus:

- Complete the NestJS API implementation with full module coverage (events, courses, registration, scores)
- Implement Next.js frontend with better-auth integration and daisyUI components
- Establish end-to-end connectivity between API and web app

Recent changes:

- **JWT Authentication Implementation**: Complete end-to-end authentication flow between Next.js (Better Auth) and NestJS API; implemented JWT token re-signing pattern where EdDSA tokens from Better Auth are converted to HS256 tokens for backend validation using shared secret
- **API Route Proxy**: Created `apps/web/app/api/events/search/route.ts` as server-side authentication bridge that validates sessions, generates JWT tokens, and proxies requests to backend API with proper authorization headers
- **Backend JWT Guard**: Modified `apps/api/src/auth/jwt.guard.ts` to validate HS256 JWT tokens using `jsonwebtoken` library with shared `BETTER_AUTH_JWT_SECRET` environment variable
- **Golf Genius Frontend Integration**: Updated golf-genius page to use `EventDto` from shared `@repo/dto` package and call real API endpoint instead of mock data; removed `TournamentEvent` interface in favor of shared types
- **Better Auth Configuration**: Enabled JWT plugin in Next.js app with EdDSA algorithm for secure client-side tokens; configured shared JWT secret for cross-service authentication
- **Environment Configuration**: Added `API_URL=http://localhost:3333` to web app environment for backend API communication; ensured shared JWT secret consistency across services
- **Drizzle ORM Integration**: Installed drizzle-orm@0.44.7 and mysql2@3.15.3, configured connection pooling with DATABASE_URL env variable, created complete database schema and relations for events, courses, registration, scores, and auth tables
- **Events Module Implementation**: Built complete events module with service, controller, domain logic, DTOs, and comprehensive test coverage; includes tee time calculations, group assignments, and hole-based starts
- **Golf Genius Integration Module**: Complete bidirectional integration with Golf Genius API v2 including event sync, member roster sync, roster export, scores import, and comprehensive error handling with retry logic and rate limiting
- **Tournament Results Import**: Implemented comprehensive TypeScript solution for importing Golf Genius tournament results with format-specific parsers (points, skins, proxy, stroke play); includes flexible DTOs, result parsers with ordinal logic, service skeleton, controller endpoints, and comprehensive unit tests
- **Close Event Feature**: Added POST /events/:eventId/close endpoint that updates all tournament result payoutStatus to "Confirmed" and payoutDate to current timestamp; includes comprehensive validation (event must have tournaments and results, cannot be already closed) and proper error handling

Important decisions & constraints:

- **Domain-Driven Design**: Events module uses domain layer with pure business logic, separated from infrastructure concerns
- **Type Safety**: Strict TypeScript usage with no `any` types in production code; test files use proper domain types
- **Database Separation**: MySQL for domain data via Drizzle, SQLite for auth via better-auth
- **Shared Types**: DTO package enforces consistent payloads across API and web app
- **Containerization**: All databases run in Docker for development parity

Notes for future work:

- Migration strategy uses Drizzle with no schema ownership (external database)
- Authentication flow: better-auth in Next.js → JWT validation in NestJS API
