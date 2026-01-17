# CLAUDE.md

In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Project Overview

Bunker Hills Men's Club is a group of golf enthusiastics who compete in weekly and monthly competitions throughout
the summery. This monorepo contains the websites and services to manage every aspect of the club's online experience:

- Public facing website for club information and event registration
- Django backend provides a RESTful layer over club data and django's built-in table administration screens
- MySQL to store club data
- Backend nestjs api to orchestrate administration, registration and payments, and integration with the Golf Genius
  tournament management system
- Administrative next.js website to manage events, members, players, reports, etc.

```
bhmc-admin/
├── apps/
│   ├── api/        # NestJS (API)
│   ├── web/        # Next.js (admin website)
│   └── public/     # React SPA (member site)
├── backend/        # Django RESTful backend
├── packages/
│   ├── domain/     # Shared TS types (used by all TS apps)
│   └── eslint-config/
├── pnpm-workspace.yaml
└── turbo.json
```

## Commands

```bash
# Development
pnpm dev                    # Start both apps in parallel
pnpm --filter api dev       # Start API only (port 3000)
pnpm --filter web dev       # Start web only (port 3300)

# Build
pnpm build                  # Build all packages

# Testing
pnpm test                   # Run all tests
pnpm --filter api test      # API tests only
pnpm --filter web test      # Web tests only
pnpm --filter api test -- --testPathPattern="events"  # Run specific test file/pattern

# Linting & Formatting
pnpm lint                   # ESLint check
pnpm lint:fix               # ESLint fix
pnpm format                 # Prettier format
pnpm format:check           # Prettier check
```

## Architecture

### Monorepo Structure

- `apps/api` - NestJS backend with Drizzle ORM + MySQL
- `apps/web` - Next.js frontend with Tailwind CSS v4 + daisyUI 5
- `apps/public` - React SPA public frontend with Bootstrap 5 + Tanstack Query
- `backend` - Django + django-rest-framework, Djoser for auth
- `packages/domain` - Shared TypeScript types and domain logic

## API (nestjs)

### Patterns

- **Barrel Exports**: Each module exports public API via `index.ts`
- **Domain-Driven Design**: Service/controller/DTO layers per module
- **API Repositories**: Only accept and return internal models or primitives
- **API Services**: Only accept and return domain models or primitives
- **TypeScript**: Strict mode, no `any` in production code
- **Configuration**: .env files validated with Joi
- **Database**: MySQL 8
  - Django owns the schema and migrations, requiring converstion from snake-case to camel-case
  - API uses Drizzle ORM (external schema - no migrations)

### API Module Structure

```
{module}/
├── {module}.module.ts          # NestJS module declaration
├── index.ts                    # Barrel exports
├── {name}.controller.ts        # HTTP handlers
├── mappers.ts                  # Row → domain type converters
├── services/
│   └── {name}.service.ts       # Business logic
├── repositories/
│   └── {name}.repository.ts    # Drizzle data access
├── errors/
│   └── {module}.errors.ts      # Custom HttpExceptions
├── cron/                       # Scheduled tasks (optional)
└── __tests__/
    └── {name}.test.ts          # Jest tests
```

## Naming Conventions

| Layer      | File                               | Class                            |
| ---------- | ---------------------------------- | -------------------------------- |
| Controller | `admin-registration.controller.ts` | `AdminRegistrationController`    |
| Service    | `admin-registration.service.ts`    | `AdminRegistrationService`       |
| Repository | `registration.repository.ts`       | `RegistrationRepository`         |
| Error      | `registration.errors.ts`           | `SlotConflictError`              |
| Mapper     | `mappers.ts`                       | `toPlayer()`, `toRegistration()` |

### Data Flow

```
Controller → Service → Repository → Drizzle
     ↓           ↓           ↓
   DTO      Domain Type    Row Type
```

- **Repositories**: Accept/return row types or primitives, throw `Error` on not found
- **Services**: Accept/return domain types, throw `HttpException` subclasses
- **Mappers**: `to{DomainType}(row)` functions bridge rows → domain types

### Error Handling

```typescript
// Custom errors extend HttpException
export class SlotConflictError extends HttpException {
	constructor() {
		super("Slots already reserved", HttpStatus.CONFLICT)
	}
}

// Service throws domain-specific errors
if (!row) throw new BadRequestException(`Event ${id} not found`)
```

### Test Patterns

```typescript
// Factory functions with Partial<T> overrides
const createPlayerRow = (overrides: Partial<PlayerRow> = {}): PlayerRow => ({
	id: 1,
	firstName: "Test",
	// ... defaults
	...overrides,
})

// Mock factories
const createMockRepository = () => ({
	findById: jest.fn(),
	update: jest.fn(),
})
```

## Domain Package

**Types** (`@repo/domain/types`):

- Organized by feature: `events/`, `register/`, `courses/`
- Base types: `ClubEvent`, `Registration`, `Player`
- Composed variants: `CompleteClubEvent`, `CompleteRegistration`
- Choice constants: `EventTypeChoices`, `RegistrationStatusChoices`

**Functions** (`@repo/domain/functions`):

- Pure, deterministic, no side effects
- Validation: `validateClubEvent()` throws or returns narrowed type
- Utilities: `formatCurrency()`, `getAge()`, `calculateTeeTime()`

## Web Admin (next.js)

### Patterns

- **Data fetching**: Plain `fetch` + `useState`/`useEffect` (no React Query)
- **Forms**: `useReducer` for complex state (no form library)
- **State**: React Context for auth, local state otherwise
- **Styling**: Tailwind v4 + daisyUI 5 utility classes
- **API**: Routes in `/app/api/` proxy to backend with Django tokens

### Auth

- **Credentials**: email and password protected accounts, owned by the Django backend
- **Roles**: roles defined in Django
  - Admin
  - Super Admin (no use cases yet)

## Public Web (react spa)

### Patterns

- **Data fetching**: Tanstack Query
- **Forms**: React Hook Form
- **State**: React Context for registration and authentication
- **Styling**: Bootstrap v5 + custom SCSS
- **Multiple Backends**
  - apiUrl() to talk to the Django backend
  - serverUrl() to talk to the nestjs api for registration flows
- **Types**: zod used to validate api data
- **Classes**:
  - classes used to transform snake_case from Django to camelCase
  - class methods consolidate functional methods

## Project Structure

```
src/
├── components/    # Reusable UI components
├── screens/       # Page-level route components
├── hooks/         # Custom React hooks
├── models/        # TypeScript types + Zod schemas
├── context/       # Auth, registration, layout state
├── forms/         # Form handlers + views
├── layout/        # Main, auth, admin layouts
└── utils/         # API client, date utils, config
```

### Testing

Use a flat test structure. No nested `describe` and `it` aliases. Example:

```typescript
test("test data is generated correctly", () => {
	const slots = buildTeetimeSlots(1, 1, 5, 5)
	const result = RegistrationSlotApiSchema.safeParse(slots[0])
	if (!result.success) {
		console.error(result.error.message)
	}
	expect(result.success).toBe(true)
})
```

Strive for high coverage of functional code.

If you create UX component tests, do not test implementation details. Test from the point
of view of a user of a component.

To run a single test file:

```bash
npx vitest run src/components/buttons/__tests__/register-button.test.tsx
```

## Backend (django)

### Django Apps

| App       | Purpose                                          |
| --------- | ------------------------------------------------ |
| core      | User management, authentication, season settings |
| events    | Tournaments, event fees, rounds, results         |
| register  | Player profiles, registrations, slots, fees      |
| payments  | Stripe payments and refunds                      |
| courses   | Golf courses and hole data                       |
| damcup    | Season-long points competition                   |
| scores    | Event scoring and scorecards                     |
| documents | Photos and document management                   |
| messaging | Announcements and contact messages               |
| policies  | Club policies and rules                          |
| content   | Tags and page content                            |

### Commands

```bash
# Install dependencies
uv sync

# Run server
uv run python manage.py runserver

# Run tests
uv run python manage.py test

# Run migrations
uv run python manage.py migrate
```

### Environment

Set `DJANGO_ENV` to control configuration:

- `local` - uses `config/.env.local`
- `docker` - uses `config/.env.docker`
- `prod` - uses `config/.env`

### Authentication

Credentials-based authentication via [Djoser](https://djoser.readthedocs.io/).

| Endpoint                                   | Description                          |
| ------------------------------------------ | ------------------------------------ |
| `POST /auth/token/login/`                  | Obtain auth token (email + password) |
| `POST /auth/token/logout/`                 | Invalidate current token             |
| `POST /auth/users/`                        | Register new user                    |
| `POST /auth/users/reset_password/`         | Request password reset               |
| `POST /auth/users/reset_password_confirm/` | Confirm password reset               |

## General Agent Instructions

Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely from where you left off. Therefore, do not stop tasks early due to token budget concerns. As you approach your token budget limit, save your current progress and state to memory before the context window refreshes. Always be as persistent and autonomous as possible and complete tasks fully, even if the end of your budget is approaching. Never artificially stop any task early regardless of the context remaining.

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

Please write a high-quality, general-purpose solution using the standard tools available. Do not create helper scripts or workarounds to accomplish the task more efficiently. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.

**IMPORTANT**: At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise.
