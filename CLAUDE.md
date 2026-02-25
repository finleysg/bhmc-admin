# CLAUDE.md

## CRITICAL Rules

- **NEVER change the password for auth_user id=1.** This is the project owner's account. Do not reset, update, or overwrite this password under any circumstances.

- Never modify user passwords, authentication credentials, or seed data without explicit user approval. Always ask before changing any auth-related data.

## Project Overview

Golf tournament management system for Bunker Hills Men's Club (BHMC). This monorepo contains the admin API and admin web dashboard. It complements a separate Django backend (data.bhmc.org) that owns the database schema and a React SPA (bhmc.org) for public-facing users.

## Code Style

This project uses tab-based indentation. When editing files, always match the existing tab indentation exactly. Never convert tabs to spaces.

This project uses TypeScript with strict mode. Always handle possibly-undefined array accesses with non-null assertions or proper guards. Use the full markdown editor component (ContentEditor) for any rich text fields, not simplified alternatives.

## Data

- The Django backend at data.bhmc.org is the source of truth for data. The NestJS API reads/writes the same MySQL database using Drizzle ORM (schema defined externally — no migrations in this repo).

## Build & Development

When the UI package (`packages/ui` or similar) is modified, it must be rebuilt (check for a build/compile step that outputs to `dist/`) before changes will appear in the consuming app. Always rebuild UI packages after editing them.

## Feedback

Use the following tools / commands as feedback on your work.

`pnpm format`
`pnpm lint` (fix warnings and errors, even if pre-existing)
`pnpm test` (fix failures, even if pre-existing)
`pnpm build`

When a change is made to a next app, rebuild the container.

### IMPORTANT: UX Feedback

Use the `playwright cli` skill to validate your work directly:

- Public site: http://localhost:3000
- Admin next site: http://localhost:3100
- Public next site: http://localhost:3200
