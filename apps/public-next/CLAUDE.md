# apps/public-next

Next.js 16 rewrite of the public site (replacing apps/public).

## Next.js 16 Conventions

This app uses **Next.js 16**, which renames several conventions from earlier versions:

- **`proxy.ts`** replaces `middleware.ts`. The exported function is named `proxy` (not `middleware`). It runs on the Node.js runtime (edge runtime is not supported). The `config.matcher` pattern works the same way.
- Route protection for `/member/*` is handled in `proxy.ts` by checking the `access_token` cookie.

## Authentication

- Django djoser token auth via cookie. The Django backend sets an `httponly` cookie named `access_token` on login.
- `lib/django-auth.ts` — client-side auth functions (login, logout, getCurrentUser) that call the Next.js auth proxy.
- `app/api/auth/[...path]/route.ts` — Next.js API route that proxies auth requests to Django (server-side, avoids CORS). Supports: login, logout, me, register, reset-password, reset-password-confirm, activation.
- `lib/auth-context.tsx` — React context provider (`useAuth` hook) for client components.
- `lib/fetchers.ts` — `fetchDjango` (public/cached) and `fetchDjangoAuthenticated` (reads `access_token` cookie via `next/headers`).

## Environment Variables

- `DJANGO_API_URL` — Django URL for server-side calls (default: `http://backend:8000/api`)
- `NEXT_PUBLIC_DJANGO_URL` — Django URL for client-side use (photo URL resolution only, default: `http://localhost:8000`)
- `API_URL` — NestJS API URL for server-side calls (default: `http://api:3333`)

## Project Structure

- `app/` — App Router pages and API routes
- `components/` — Shared UI components (shadcn/ui based)
- `lib/` — Utilities, types, fetchers, auth
- `proxy.ts` — Request interception (Next.js 16 replacement for middleware.ts)
