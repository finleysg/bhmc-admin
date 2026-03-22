# Bunker Hills Men's Club

Club management system for [Bunker Hills Men's Club](https://bhmc.org). Monorepo containing the admin API, admin dashboard, public website, and Django backend.

## Architecture

```
bhmc/
├── apps/
│   ├── admin/          Next.js admin dashboard (:3100)
│   ├── api/            NestJS API (:3333)
│   └── public-next/    Next.js public site (:3200)
├── backend/            Django backend (:8000)
├── packages/
│   ├── domain/         Shared types and business logic
│   └── eslint-config/  Shared ESLint config
├── e2e/                Playwright end-to-end tests
└── docker-compose.yml
```

The Django backend at data.bhmc.org owns the database schema and handles authentication (Djoser token auth). The NestJS API reads/writes the same MySQL database using Drizzle ORM and handles admin operations, event registration, and Stripe payments. Both Next.js apps proxy auth requests through their own API routes to avoid CORS.

## Tech Stack

| Layer             | Technology                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Frontend (Admin)  | Next.js 16, React 19, Tailwind v4, daisyUI 5                     |
| Frontend (Public) | Next.js 16, React 19, shadcn/ui, React Hook Form, TanStack Query |
| API               | NestJS, TypeScript, Drizzle ORM                                  |
| Backend           | Django, Python, MySQL 8.4                                        |
| Payments          | Stripe                                                           |
| Analytics         | PostHog                                                          |
| Email             | React Email, Nodemailer, Mailgun                                 |
| Testing           | Jest (unit), Playwright (e2e)                                    |
| Tooling           | pnpm, Turborepo, Docker, ESLint, Prettier, Husky                 |
| CI/CD             | GitHub Actions, CapRover                                         |

## Prerequisites

- Node.js 24
- pnpm 10
- Python with [uv](https://docs.astral.sh/uv/)
- Docker

## Getting Started

```bash
pnpm install
docker compose up -d
```

### Local Services

| Service         | URL                   |
| --------------- | --------------------- |
| Django backend  | http://localhost:8000 |
| NestJS API      | http://localhost:3333 |
| Admin dashboard | http://localhost:3100 |
| Public site     | http://localhost:3200 |
| Mailpit         | http://localhost:8025 |

## Development

```bash
pnpm dev           # Start all apps (Turbo)
pnpm build         # Build all apps
pnpm lint          # Lint all apps
pnpm test          # Run unit tests
pnpm typecheck     # TypeScript checks
pnpm test:e2e      # Playwright end-to-end tests
pnpm format        # Format with Prettier
```

### Backend

```bash
cd backend
uv sync
uv run python manage.py runserver
uv run python manage.py test
uv run python manage.py migrate
```

Set `DJANGO_ENV` to control configuration: `local`, `docker`, or `prod`.

## Deployment

Tagged releases trigger GitHub Actions workflows that build Docker images, upload source maps to PostHog, and deploy to CapRover.

| App     | Tag pattern                      |
| ------- | -------------------------------- |
| API     | `api-v{yyyy}.{mm}.{dd}.{nn}`     |
| Admin   | `admin-v{yyyy}.{mm}.{dd}.{nn}`   |
| Backend | `backend-v{yyyy}.{mm}.{dd}.{nn}` |
| Public  | `public-v{yyyy}.{mm}.{dd}.{nn}`  |

## Infrastructure (DigitalOcean)

| Season     | Spec               |
| ---------- | ------------------ |
| Off season | 1 vCPU / 2 GiB RAM |
| In season  | 2 vCPU / 4 GiB RAM |

### Services

| Container    | Stack         |
| ------------ | ------------- |
| bhmc-public  | Next.js       |
| bhmc-admin   | Next.js       |
| bhmc-api     | NestJS        |
| bhmc-backend | Django        |
| CapRover     | Orchestration |
| nginx        | Reverse proxy |
