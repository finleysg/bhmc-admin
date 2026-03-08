# Rewrite Public Site as Next.js v16 App

## Context

The public-facing club website (`apps/public/`) is a React 19 SPA built with Vite, Bootstrap 5, React Router, and TanStack Query. It has ~40 routes covering events, registration, member accounts, photos, results, and more. As a client-rendered SPA, it misses SSR/SSG benefits: slower first paint, no SEO for public content, and no server-side data fetching. The rewrite moves to Next.js 16 with App Router to leverage SSR/SSG where beneficial, adopts Tailwind + shadcn/ui for a visual refresh, and follows patterns established by the admin app (`apps/web/`).

## Decisions

| Decision             | Choice                                          |
| -------------------- | ----------------------------------------------- |
| Styling              | Tailwind CSS v4 + shadcn/ui                     |
| Scope                | Tech migration + UI redesign                    |
| Strategy             | Big bang (complete before switching)            |
| App name             | `apps/public-next`                              |
| Event URLs           | Keep existing `/event/:date/:name` scheme       |
| Zod schemas          | Centralize into `packages/domain`               |
| Client data fetching | TanStack Query (keep from current app)          |
| Photo serving        | Django media files + `next/image` custom loader |
| Dev port             | `3200`                                          |

## Architecture

### Rendering Strategy

| Route Category                              | Strategy          | Rationale                          |
| ------------------------------------------- | ----------------- | ---------------------------------- |
| Home, about, contact, policies              | SSG               | Mostly static content              |
| Calendar, events list                       | SSR + cache       | SEO + fresh data, cacheable        |
| Event detail                                | SSR               | Dynamic, SEO-worthy                |
| Champions, results, scores, dam-cup, points | SSR + cache       | Cacheable data, SEO benefit        |
| Member directory, player profiles           | SSR               | SEO for member profiles            |
| Photo gallery                               | SSR + streaming   | Image-heavy, progressive loading   |
| Registration flow                           | Client components | Complex multi-step state, Stripe   |
| Payment flow                                | Client components | Stripe integration, no SSR benefit |
| Member account/hub                          | Client components | Authenticated, interactive         |
| Auth (login/register/reset)                 | Client components | Forms, no SEO need                 |

### Data Fetching

- **Server components**: Fetch directly from Django API (`DJANGO_API_URL`) and NestJS API (`API_URL`) using server-side env vars — no browser exposure of backend URLs
- **Authenticated server fetches**: Extract Django `access_token` cookie via `cookies()` API, forward as `Authorization: Token <token>` header (same pattern as `apps/web/lib/api-proxy.ts`)
- **API route proxies** (`app/api/`): For client-side mutations (registration, payments, account updates) — proxy to backends with auth token forwarding
- **Client components**: TanStack Query for client-side data fetching, mutations, optimistic updates, and cache invalidation (especially critical for registration flow)

### Auth

Mirror `apps/web/` pattern:

- Django sets `access_token` httponly cookie on login
- Next.js middleware reads cookie to protect `/member/*` routes
- Server components access cookie via `cookies()` for authenticated fetches
- API routes extract cookie and forward to backends
- Login/logout pages as client components posting to Django auth endpoints through local API routes

### Styling

- Tailwind CSS v4 + shadcn/ui components
- lucide-react for icons (shadcn default)
- Dark mode support via CSS variables / class strategy
- framer-motion for animations (already used in admin app)
- Responsive mobile-first design

## Route Mapping

```
Current (React Router)              → New (App Router)
─────────────────────────────────────────────────────────────
/                                   → app/page.tsx
/home                               → redirect to /
/membership                         → app/membership/page.tsx
/calendar/:year/:monthName          → app/calendar/[year]/[month]/page.tsx
/about-us                           → app/about/page.tsx
/contact-us                         → app/contact/page.tsx
/contact-us/message                 → app/contact/message/page.tsx
/gallery                            → app/gallery/page.tsx
/gallery/:id                        → app/gallery/[id]/page.tsx
/directory                          → app/directory/page.tsx
/directory/:playerId                → app/directory/[playerId]/page.tsx
/policies/:policyType               → app/policies/[policyType]/page.tsx
/champions/:season                  → app/champions/[season]/page.tsx
/match-play                         → app/match-play/page.tsx
/season-long-points                 → app/points/page.tsx
/dam-cup                            → app/dam-cup/page.tsx
/my-scores                          → app/member/scores/page.tsx

/member                             → app/member/page.tsx (layout-protected)
/member/account                     → app/member/account/page.tsx
/member/friends                     → app/member/friends/page.tsx
/member/scores                      → app/member/scores/page.tsx
/member/results                     → app/member/results/page.tsx

/event/:eventDate/:eventName        → app/event/[eventDate]/[eventName]/page.tsx
/event/.../reserve                  → app/event/[eventDate]/[eventName]/reserve/page.tsx
/event/.../register                 → app/event/[eventDate]/[eventName]/register/page.tsx
/event/.../edit                     → app/event/[eventDate]/[eventName]/edit/page.tsx
/event/.../manage/*                 → app/event/[eventDate]/[eventName]/manage/[action]/page.tsx
/event/.../review                   → app/event/[eventDate]/[eventName]/review/page.tsx
/event/.../payment                  → app/event/[eventDate]/[eventName]/payment/page.tsx
/event/.../complete                 → app/event/[eventDate]/[eventName]/complete/page.tsx
/event/.../registrations            → app/event/[eventDate]/[eventName]/registrations/page.tsx

/session/login                      → app/sign-in/page.tsx
/session/account                    → app/sign-up/page.tsx
/session/account/confirm            → app/sign-up/confirm/page.tsx
/session/account/activate/:uid/:t   → app/activate/[uid]/[token]/page.tsx
/session/reset-password             → app/reset-password/page.tsx
/session/reset-password/sent        → app/reset-password/sent/page.tsx
/session/reset-password/:uid/:t     → app/reset-password/[uid]/[token]/page.tsx
/session/reset-password/complete    → app/reset-password/complete/page.tsx
```

## App Directory Structure

```
apps/public-next/
├── app/
│   ├── layout.tsx               # Root layout: html, body, providers, header, footer
│   ├── page.tsx                 # Home (SSG or SSR)
│   ├── about/page.tsx
│   ├── membership/page.tsx
│   ├── contact/
│   ├── calendar/[year]/[month]/page.tsx
│   ├── event/[eventDate]/[eventName]/
│   │   ├── layout.tsx           # Load event data, shared event context
│   │   ├── page.tsx             # Event detail (SSR)
│   │   ├── register/page.tsx    # Client component
│   │   ├── reserve/page.tsx
│   │   ├── edit/page.tsx
│   │   ├── manage/[action]/page.tsx
│   │   ├── review/page.tsx
│   │   ├── payment/page.tsx
│   │   ├── complete/page.tsx
│   │   └── registrations/page.tsx
│   ├── gallery/
│   ├── directory/
│   ├── policies/[policyType]/page.tsx
│   ├── champions/[season]/page.tsx
│   ├── match-play/page.tsx
│   ├── points/page.tsx
│   ├── dam-cup/page.tsx
│   ├── member/
│   │   ├── layout.tsx           # Auth guard layout
│   │   ├── page.tsx             # Member hub
│   │   ├── account/page.tsx
│   │   ├── friends/page.tsx
│   │   ├── scores/page.tsx
│   │   └── results/page.tsx
│   ├── sign-in/page.tsx
│   ├── sign-up/
│   ├── activate/[uid]/[token]/page.tsx
│   ├── reset-password/
│   └── api/                     # API route proxies
│       ├── auth/[...path]/route.ts
│       ├── registration/[...path]/route.ts
│       ├── payments/[...path]/route.ts
│       ├── events/[...path]/route.ts
│       ├── players/[...path]/route.ts
│       ├── photos/[...path]/route.ts
│       └── contact/route.ts
├── components/
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── api-proxy.ts             # Reuse pattern from apps/web/lib/api-proxy.ts
│   ├── auth-context.tsx         # Client-side auth context
│   ├── django-auth.ts           # Auth utilities
│   ├── fetchers.ts              # Server-side data fetching helpers
│   └── utils.ts                 # cn() helper, formatters
├── next.config.ts
├── tailwind.config.ts
├── components.json              # shadcn/ui config
├── Dockerfile
├── Dockerfile.dev
├── package.json
├── tsconfig.json
└── .env.development
```

## What Gets Reused

| Asset                       | Source                                   | Reuse Strategy                                    |
| --------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Domain types                | `packages/domain`                        | Import directly (already shared)                  |
| Zod schemas                 | `apps/public/src/models/*.ts`            | Centralize into `packages/domain`                 |
| API proxy pattern           | `apps/web/lib/api-proxy.ts`              | Copy and adapt for public-next                    |
| Auth cookie pattern         | `apps/web/lib/django-auth.ts`            | Reuse same approach                               |
| Registration business logic | `apps/public/src/context/registration-*` | Adapt reducer/state machine for client components |
| Stripe integration          | `apps/public/src/components/payment/`    | Adapt — Stripe React SDK stays client-side        |
| Date/formatting utils       | `apps/public/src/utils/`                 | Copy relevant helpers                             |
| Test data builders          | `apps/public/src/test/`                  | Adapt for Jest                                    |

## What Gets Rewritten

| Area                    | Why                                                                          |
| ----------------------- | ---------------------------------------------------------------------------- |
| All component markup    | Bootstrap → Tailwind + shadcn/ui                                             |
| Routing                 | React Router → Next.js App Router                                            |
| Data fetching hooks     | TanStack Query stays for client components; server components fetch directly |
| Layout/navigation       | SPA layout → Next.js layouts with server rendering                           |
| Styling (19 SCSS files) | SCSS → Tailwind utility classes                                              |
| Auth provider           | Context-only → middleware + context + API routes                             |
| Image handling          | Static assets → next/image optimization                                      |

## Implementation Phases

### Phase 1: Scaffold + Core Infrastructure

1. Create `apps/public-next` with Next.js 16, Tailwind v4, shadcn/ui
2. Configure `package.json`, `tsconfig.json`, `next.config.ts` (standalone output)
3. Set up Tailwind + shadcn/ui with theme (light/dark)
4. Add to `pnpm-workspace.yaml` (already covered by `apps/*` glob)
5. Create `Dockerfile.dev` and add to `docker-compose.yml`
6. Set up `.env.development` with backend URLs
7. Implement `lib/api-proxy.ts` (copy from `apps/web/`, adapt)
8. Implement auth: `lib/auth-context.tsx`, `lib/django-auth.ts`, middleware
9. Create root layout with header, navigation, footer
10. Create sign-in page to verify auth flow end-to-end

### Phase 2: Static/SSG Pages

1. Home page
2. About us
3. Contact us + send message form
4. Policies
5. Membership info

### Phase 3: SSR Data Pages

1. Calendar view
2. Event list / event detail
3. Champions
4. Season-long points
5. Match play results
6. Dam Cup
7. Low scores / aces
8. Member directory + player profiles
9. Photo gallery

### Phase 4: Registration Flow (Client-Heavy)

1. Event registration context/reducer (adapt from current app)
2. Reserve tee times
3. Player selection (register flow)
4. Edit registration
5. Manage registration (add/drop/move/replace/notes)
6. Review + payment (Stripe)
7. Registration complete
8. View registered players

### Phase 5: Member Area

1. Member hub/dashboard
2. Account management (profile, photo, password)
3. Friends list
4. My scores
5. My results/events

### Phase 6: Auth Flows

1. Sign up + email confirmation
2. Account activation
3. Password reset flow
4. Maintenance mode handling

### Phase 7: Polish + Testing

1. Error boundaries and not-found pages
2. Loading states (Suspense boundaries, streaming)
3. SEO metadata per route
4. Mobile responsive review
5. Tests: unit tests for business logic, component tests for key flows
6. Accessibility audit
7. Performance audit (Core Web Vitals)

### Phase 8: Deployment Prep

1. Production Dockerfile
2. Update CI/CD pipeline
3. Environment variable configuration for production
4. Update root `docker-compose.yml` to replace `public` service
5. Update `CLAUDE.md` files

## Key Files to Reference During Implementation

- `apps/web/lib/api-proxy.ts` — API proxy pattern to copy
- `apps/web/lib/auth-context.tsx` — Auth context pattern
- `apps/web/lib/django-auth.ts` — Django auth helpers
- `apps/web/app/layout.tsx` — Root layout reference
- `apps/web/Dockerfile` / `Dockerfile.dev` — Docker templates
- `apps/web/app/global.css` — Tailwind + plugin setup
- `apps/public/src/context/registration-*` — Registration state logic
- `apps/public/src/models/*.ts` — Zod schemas and domain models
- `apps/public/src/hooks/*.ts` — Data fetching patterns (endpoints, transforms)
- `apps/public/src/components/payment/` — Stripe integration
- `packages/domain/src/` — Shared types to import

## Verification

1. `docker compose up -d --build` — all services start including `public-next`
2. Navigate to `http://localhost:3200` — home page renders server-side
3. View page source — SSR content visible in HTML
4. Sign in → member hub → verify auth flow works
5. Navigate to event → complete registration → payment → verify full flow
6. `pnpm --filter public-next test` — all tests pass
7. `pnpm --filter public-next build` — standalone build succeeds
8. Lighthouse audit — verify Core Web Vitals improvement over SPA
