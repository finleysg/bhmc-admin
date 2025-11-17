# Product Context

Problem:

- Tournament administrators need comprehensive tools to manage golf events, player registration, and scoring
- Current Golf Genius integration is manual and limited, requiring significant administrative overhead
- Existing systems (React frontend and Django backend) lack administrative interfaces for tournament operations
- Data synchronization between Golf Genius and internal systems is error-prone and time-consuming
- Tournament coordinators need real-time visibility into registrations, pairings, and results

Target users:

- Tournament directors and coordinators responsible for event planning and execution
- Club administrators managing member registrations and tournament logistics
- Scorekeepers and volunteers handling on-site tournament operations
- IT staff maintaining integrations and data synchronization

Core capabilities:

- **Tournament Management**: Complete event lifecycle from setup through completion with tee time calculations, group assignments, and hole-based starts
- **Player Registration**: Automated registration slots, fee tracking, and player management with Golf Genius synchronization
- **Golf Genius Integration**: Bidirectional sync for events, rosters, scores, and tournament results with comprehensive error handling
- **Scoring & Results**: Scorecard management, automated results import, and reporting across multiple tournament formats
- **Administrative Dashboard**: Authenticated admin interface for all tournament operations with audit logging
- **Reporting & Analytics**: Complete tournament reports (event, points, finance, results) with Excel export using ExcelJS; tournament summaries, player statistics, and integration monitoring

Success criteria:

- Complete NestJS API with domain-driven design for all modules (events, courses, registration, scores)
- Operational Golf Genius integration with automated sync capabilities and comprehensive error handling
- Next.js admin interface with authentication, core management screens, and responsive design
- End-to-end testing coverage with zero ESLint violations and production-ready code quality
- Docker containerization for development environments and deployment readiness
- Type-safe communication between all system components via shared DTO package
