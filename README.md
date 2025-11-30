# BHMC Admin

![CodeRabbit PRs](https://img.shields.io/coderabbit/prs/github/finleysg/bhmc-admin)

Administrative interface for golf tournament management, designed to complement the [BHMC React frontend](https://github.com/finleysg/bhmc) and [Django backend](https://github.com/finleysg/bhmc-api).

## Features

- **Tournament Management:** Full event lifecycle, tee time calculations, group assignments, hole-based starts
- **Player Registration:** Automated slots, fee tracking, Golf Genius sync
- **Golf Genius Integration:** Bidirectional sync for events, rosters, scores, and results
- **Scoring & Results:** Scorecard management, automated results import, multi-format reporting
- **Admin Dashboard:** Authenticated interface for all tournament operations, audit logging
- **Reporting & Analytics:** Tournament reports, player stats, Excel export

## Tech Stack

- Node.js 20+, pnpm@10+, TurboRepo
- **API:** NestJS, Drizzle ORM (MySQL, containerized via Docker), Zod, Axios, RxJS, ExcelJS
- **Web:** Next.js (App Router, TypeScript), better-auth, Tailwind CSS v4, daisyUI 5, @tanstack/react-table
- **Shared Types:** TypeScript domain package for DTOs and interfaces
- **Testing:** Jest, ESLint, Prettier (zero errors)

## Setup

```sh
pnpm install
pnpm docker:up        # Start MySQL/SQLite containers
pnpm dev              # Run both apps (API & Web)
pnpm lint             # Lint all code
pnpm test             # Run all tests
```

- API: `apps/api` (NestJS, MySQL)
- Web: `apps/web` (Next.js, SQLite for auth)

## Usage

- API health: `GET /health`
- Web health: `GET /health`
- Auth: better-auth (see `.env.example` in each app)
- Reports: Excel export via admin dashboard

## Development Notes

- Strict TypeScript, no `any` types in production
- Domain-driven design, shared DTOs/interfaces
- Module boundaries enforced via barrel exports
- ESLint/Prettier: zero errors, consistent formatting
- Dockerized databases for dev parity

## Related Projects

- [BHMC React frontend](https://github.com/finleysg/bhmc)
- [BHMC Django backend](https://github.com/finleysg/bhmc-api)
- [daisyUI documentation](https://daisyui.com/docs/)
