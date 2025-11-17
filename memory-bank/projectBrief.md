# Project Brief

Project: BHMC Admin — administrative interface for an existing golf tournament management site.

Purpose:

- Provide an admin UI to manage tournaments, players, schedules and integration with Golf Genius.
- Complement existing systems (React frontend at https://github.com/finleysg/bhmc and Django backend
  at https://github.com/finleysg/bhmc-api) rather than replace them.

Goals (Core Implementation Phase):

- Implement complete NestJS API with domain-driven design for events, courses, registration, and scores modules
- Build comprehensive Golf Genius integration with bidirectional sync, roster management, and tournament results import
- Develop Next.js admin interface with better-auth authentication and daisyUI components
- Establish type-safe communication between API and frontend via shared DTO package
- Ensure production-ready code quality with comprehensive testing and zero ESLint violations
- Achieve comprehensive unit test coverage for domain logic and API utilities with Jest

Out of scope for this phase:

- Production deployment configuration.

Authors: Project owner (you) + scaffolded by Cline
