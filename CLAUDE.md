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
- **Validation**: Zod for runtime validation, class-validator for NestJS DTOs
- **Testing**: Jest with `Partial<T>` patterns for type-safe mocks
- **Environment**: Config via `.env` files, validated with Joi

## Patterns

- **Barrel Exports**: Each module exports public API via `index.ts`
- **Domain-Driven Design**: Service/controller/DTO layers per module
- **Type-Safe Testing**: Use actual domain types, not `any`, in test fixtures
- **API Repositories**: Only accept and return internal models
- **API Services**: Only accept and return domain models

## Planning

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise.
