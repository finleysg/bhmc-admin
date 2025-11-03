# Active Context

Current focus:

- Complete the NestJS API implementation with full module coverage (events, courses, registration, scores)
- Implement Next.js frontend with better-auth integration and daisyUI components
- Establish end-to-end connectivity between API and web app
- Set up development workflow with Docker databases and hot reloading

Recent changes:

- **Drizzle ORM Integration**: Installed drizzle-orm@0.44.7 and mysql2@3.15.3, configured connection pooling with DATABASE_URL env variable, created complete database schema and relations for events, courses, registration, scores, and auth tables
- **Events Module Implementation**: Built complete events module with service, controller, domain logic, DTOs, and comprehensive test coverage; includes tee time calculations, group assignments, and hole-based starts
- **Golf Genius Integration Module**: Complete bidirectional integration with Golf Genius API v2 including event sync, member roster sync, roster export, scores import, and comprehensive error handling with retry logic and rate limiting
- **Shared DTO Package**: Created and integrated packages/dto with type-safe DTOs for events, scores, and registration; built with TypeScript and consumed via workspace imports
- **Code Quality**: Fixed 99 ESLint violations in test files by replacing `any` types with proper domain types (`EventDomainData`, `RegistrationSlotDomainData`, etc.); achieved zero ESLint errors across codebase
- **TypeScript & Testing**: Applied Prettier formatting, ensured TypeScript compilation success, and established test patterns using `Partial<T>` for service mocks

Next immediate steps:

1. Implement remaining API modules (courses, registration, scores) following the events module pattern
2. Scaffold Next.js app with better-auth integration and SQLite persistence
3. Create shared UI components using daisyUI 5 and Tailwind CSS v4
4. Establish API-to-frontend connectivity with proper error handling
5. Add development scripts and verify Docker database connectivity
6. Implement basic admin screens for event management

Important decisions & constraints:

- **Domain-Driven Design**: Events module uses domain layer with pure business logic, separated from infrastructure concerns
- **Type Safety**: Strict TypeScript usage with no `any` types in production code; test files use proper domain types
- **Database Separation**: MySQL for domain data via Drizzle, SQLite for auth via better-auth
- **Shared Types**: DTO package enforces consistent payloads across API and web app
- **Containerization**: All databases run in Docker for development parity

Notes for future work:

- Migration strategy uses Drizzle with no schema ownership (external database)
- Authentication flow: better-auth in Next.js → JWT validation in NestJS API
