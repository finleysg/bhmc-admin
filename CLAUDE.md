# CLAUDE.md

In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Project Overview

BHMC Admin is an administrative interface for a golf tournament management site. It's a monorepo containing a NestJS API backend, Next.js frontend, and shared domain package.

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
- `packages/domain` - Shared TypeScript types and domain logic

## Key Technical Details

- **TypeScript**: Strict mode, no `any` in production code
- **Database**: MySQL via Drizzle ORM (external schema - no migrations)
- **Validation**: Plain TypeScript validation in domain package, class-validator for NestJS DTOs
- **Testing**: Jest with `Partial<T>` patterns for type-safe mocks
- **Environment**: Config via `.env` files, validated with Joi

## Patterns

- **Barrel Exports**: Each module exports public API via `index.ts`
- **Domain-Driven Design**: Service/controller/DTO layers per module
- **API Repositories**: Only accept and return internal models or primitives
- **API Services**: Only accept and return domain models or primitives

## API Module Structure

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

## Data Flow

```
Controller → Service → Repository → Drizzle
     ↓           ↓           ↓
   DTO      Domain Type    Row Type
```

- **Repositories**: Accept/return row types or primitives, throw `Error` on not found
- **Services**: Accept/return domain types, throw `HttpException` subclasses
- **Mappers**: `to{DomainType}(row)` functions bridge rows → domain types

## Error Handling

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

## Test Patterns

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

## Web Patterns

- **Data fetching**: Plain `fetch` + `useState`/`useEffect` (no React Query)
- **Forms**: `useReducer` for complex state (no form library)
- **State**: React Context for auth, local state otherwise
- **Styling**: Tailwind v4 + daisyUI 5 utility classes
- **API**: Routes in `/app/api/` proxy to backend with Django tokens

## Common Imports

```typescript
// Domain types
import type { ClubEvent, Player, CompleteRegistration } from "@repo/domain/types"

// Domain functions
import { formatCurrency, validateRegistration } from "@repo/domain/functions"

// Database (API only)
import { player, registration, DrizzleService, type PlayerRow } from "../../database"
```

## General Agent Instructions

Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely from where you left off. Therefore, do not stop tasks early due to token budget concerns. As you approach your token budget limit, save your current progress and state to memory before the context window refreshes. Always be as persistent and autonomous as possible and complete tasks fully, even if the end of your budget is approaching. Never artificially stop any task early regardless of the context remaining.

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

Please write a high-quality, general-purpose solution using the standard tools available. Do not create helper scripts or workarounds to accomplish the task more efficiently. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.

## Planning

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise.
