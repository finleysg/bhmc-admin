# Phase 4: Registration Flow Implementation Plan

## Context

The public-next app (Next.js 16 rewrite) has completed phases 1-3 and 5-6: scaffold, static pages, SSR data pages, member area, and auth flows. The event detail page is view-only — no registration functionality exists. Phase 4 adds the entire multi-step registration flow: reserve tee times, select players/fees, review, Stripe payment, and post-registration management. This is the most complex phase, involving ~50 new files, real-time SSE, Stripe Elements, and a client-side state machine.

## Architecture Overview

- **All registration pages are client components** (`"use client"`) — they depend on a shared React context/reducer for multi-step state
- **Event layout wraps children in RegistrationProvider** — state is scoped to the event route segment and cleaned up on navigation
- **API route proxies** forward to NestJS (registration CRUD, payments, SSE) and Django (slot listing, player queries)
- **SSE streams through a Next.js API route** — avoids CORS and keeps NestJS URL private
- **Stripe stays client-side** — PaymentElement renders in the browser; PaymentIntent creation goes through API proxy → NestJS → Stripe

## Sub-Phases

### 4.1: Types, Schemas, and Utility Functions

No UI — pure TypeScript. Fully testable in isolation.

**Create `lib/registration/types.ts`**

- Registration-specific types: `RegistrationMode`, `RegistrationStep`, step constants (`PendingStep` through `CompleteStep`)
- Server response interfaces: `ServerRegistration`, `ServerRegistrationSlot`, `ServerRegistrationFee`, `ServerPayment`, `ServerPaymentDetail`
- Payment types: `PaymentAmount`, `StripeAmountResponse`, `CustomerSessionResponse`
- SSE types: `SSEUpdateEvent`, `SSESlotData` (camelCase from NestJS)
- All as plain interfaces (no classes — unlike legacy app which uses `immerable` classes)

**Create `lib/registration/reserve-utils.ts`**

- Port from legacy `models/reserve.ts` but as pure functions on plain objects
- `ReserveSlot`, `ReserveGroup`, `ReserveTable` interfaces
- `loadReserveTables(event, slots)` — builds tee-time or shotgun tables from raw slot data
- `calculateTeetime(startTime, startingOrder, intervals)`, `calculateWave(groupIndex, totalGroups, signupWaves)`
- `getTeeTimeSplits(event)` — parses `tee_time_splits` string

**Create `lib/registration/payment-utils.ts`**

- `calculateAmountDue(details, eventFees)` — computes subtotal, transaction fee (Stripe: `(subtotal + $0.30) / (1 - 0.029)`), total
- `NoAmount` constant, `formatCurrency(amount)`

**Create `lib/registration/fee-utils.ts`**

- `calculateFeeAmount(fee, player)` — evaluates override restrictions (seniors, new members, etc.)
- References: legacy `models/event-fee.ts` `amountDue()` method

**Create `lib/registration/correlation.ts`**

- `getCorrelationId(eventId)` — generates/caches a 12-char random ID per event in localStorage
- Sent as `X-Correlation-ID` header on all registration API calls

**Create `lib/registration/index.ts`** — barrel exports

**Tests:** `lib/__tests__/reserve-utils.test.ts`, `payment-utils.test.ts`, `fee-utils.test.ts`

---

### 4.2: Registration State Management

**Create `lib/registration/registration-reducer.ts`**

State shape:

```
mode: "new" | "edit" | "idle"
clubEvent, registration, payment, paymentDetails[]
existingFees: Map<string, ServerRegistrationFee> | null
error, currentStep, stripeClientSession, correlationId, sseCurrentWave
```

17 actions (same as legacy): `load-event`, `create-registration`, `load-registration`, `update-registration`, `update-registration-notes`, `cancel-registration`, `complete-registration`, `reset-registration`, `update-payment`, `update-error`, `update-step`, `add-player`, `remove-player`, `add-fee`, `remove-fee`, `initiate-stripe-session`, `update-sse-wave`

Uses `produce` from immer on plain objects (not class instances).

**Create `lib/registration/registration-context.tsx`**

- `IRegistrationContext` interface with state + methods (createRegistration, cancelRegistration, loadRegistration, addPlayer, removeFee, savePayment, createPaymentIntent, initiateStripeSession, canRegister, completeRegistration, etc.)
- `useRegistration()` hook

**Create `lib/registration/registration-provider.tsx`** (the core orchestrator, ~300 lines)

- `"use client"` — wraps `useReducer` + TanStack Query `useMutation` calls + SSE hook
- Mutations call local API routes (`/api/registration/*`, `/api/payments/*`) with `X-Correlation-ID` header
- SSE hook integration: on `update` events, writes slot data into React Query cache
- `canRegister()` — checks minimum group size during priority registration
- `createInitialPaymentDetails(registration, event, player)` — auto-adds required fees for slot 0

**Reference:** `apps/public/src/context/registration-context-provider.tsx`

**Tests:** `lib/__tests__/registration-reducer.test.ts`

---

### 4.3: API Route Proxies and SSE Hook

All API routes use existing `fetchWithAuth()` from `lib/api-proxy.ts`. NestJS routes use default `API_URL`; Django routes specify `apiBaseUrl: process.env.DJANGO_API_URL`.

**Registration routes (NestJS backend):**
| File | Methods | Backend Path |
|------|---------|-------------|
| `app/api/registration/route.ts` | POST (create), GET (list) | `POST /registration` (NestJS), `GET /registration/` (Django) |
| `app/api/registration/[id]/route.ts` | GET, PATCH (notes) | `/registration/:id` (NestJS) |
| `app/api/registration/[id]/cancel/route.ts` | PUT | `/registration/:id/cancel` (NestJS) |
| `app/api/registration/[id]/add-players/route.ts` | PUT | `/registration/:id/add-players` (NestJS) |
| `app/api/registration/[id]/drop/route.ts` | DELETE | `/registration/:id/drop/` (Django) |
| `app/api/registration/[id]/move/route.ts` | PUT | `/registration/:id/move/` (Django) |
| `app/api/registration/slots/[id]/route.ts` | PATCH | `/registration/slots/:id` (NestJS) |

**Payment routes (NestJS backend):**
| File | Methods | Backend Path |
|------|---------|-------------|
| `app/api/payments/route.ts` | POST | `/payments` |
| `app/api/payments/[id]/route.ts` | PUT | `/payments/:id` |
| `app/api/payments/[id]/payment-intent/route.ts` | POST | `/payments/:id/payment-intent` |
| `app/api/payments/[id]/stripe-amount/route.ts` | GET | `/payments/:id/stripe-amount` |
| `app/api/payments/customer-session/route.ts` | POST | `/payments/customer-session` |

**SSE proxy route: `app/api/registration/[eventId]/live/route.ts`**

- Creates a `ReadableStream` that proxies the NestJS SSE endpoint (`${API_URL}/registration/${eventId}/live`)
- Pipes response body through to client with `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- Returns raw `Response(stream, { headers })`

**Create `lib/hooks/use-registration-sse.ts`**

- Client-side `EventSource` connecting to `/api/registration/${eventId}/live`
- Exponential backoff: 1s initial, 30s max, 5 retries, 2x multiplier
- Parses `update` events with Zod schemas from 4.1
- Reference: `apps/public/src/hooks/use-registration-sse.ts`

**Create `lib/hooks/use-player-registration.ts`**

- Fetches current player's registration for an event: `GET /api/registration?event_id=X&player_id=Y`

**Create `lib/hooks/use-registration-slots.ts`**

- Fetches all slots for an event: `GET /api/registration-slots?event_id=X`

---

### 4.4: Shared Registration UI Components

All under `app/event/[eventDate]/[eventName]/components/`. All `"use client"`.

**Add shadcn/ui components:** `checkbox`, `alert`, `alert-dialog`, `progress`, `tooltip`, `sonner` (toast)

| Component                      | Purpose                                           | Key Details                                                                 |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `registration-actions.tsx`     | Register/Manage/Players buttons on event detail   | Checks auth, registration status, signup window. Goes on event detail page. |
| `registration-countdown.tsx`   | Minutes:seconds countdown to registration expiry  | 1s interval, calls `cancelRegistration("timeout", "new")` on expiry         |
| `cancel-button.tsx`            | Confirm-and-cancel registration                   | `AlertDialog` confirmation, calls context `cancelRegistration`              |
| `registration-step-header.tsx` | Current step title + selected start location      | Used atop Register, Review, Payment pages                                   |
| `slot-line-item.tsx`           | One slot: player name + fee checkboxes + subtotal | Required fees auto-checked/disabled, optional toggleable                    |
| `slot-group.tsx`               | Groups slot line items together                   | Handles team headers if `teamSize > 1`                                      |
| `slot-line-item-review.tsx`    | Read-only slot for review page                    | Player name + fees with amounts, no checkboxes                              |
| `amount-due.tsx`               | Subtotal, transaction fee, total display          | Uses `Separator`, formatted currency                                        |
| `player-picker.tsx`            | Search-based player selector                      | shadcn `Command` + debounced search via `/api/players/search`               |
| `friend-picker.tsx`            | Quick-pick from friends list                      | Uses `useMyFriends` hook, `Card` on desktop / `Sheet` on mobile             |
| `reserve-grid.tsx`             | Reserve table with course tabs                    | Renders `ReserveTable[]` with slot cells, wave badges, SSE updates          |
| `reserve-row.tsx`              | Single tee time / starting hole group             | Shows group name, slot cells, reserve button. Disabled if wave locked       |
| `reserve-slot-cell.tsx`        | Individual slot in reserve grid                   | Status badge (Available/Reserved/Processing/Selected)                       |

---

### 4.5: Registration Flow Pages

**Modify `app/event/[eventDate]/[eventName]/layout.tsx`**

- Becomes server component that fetches event data, passes to client wrapper
- `EventRegistrationWrapper` (new `"use client"` component) conditionally renders `RegistrationProvider`

**Modify `app/event/[eventDate]/[eventName]/page.tsx`**

- Add `<RegistrationActions event={event} />` client component below the event detail card
- Server component stays mostly unchanged — just adds the actions component

**Create pages:**

| Page                     | Path                       | Key Behavior                                                                                                                                                                                                        |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reserve/page.tsx`       | `/event/.../reserve`       | Course tabs + reserve grid. SSE updates wave availability. On reserve: `createRegistration(course, slotIds, selectedStart)` → navigate to `../register`                                                             |
| `register/page.tsx`      | `/event/.../register`      | Countdown timer, slot group with player/friend pickers, fee checkboxes, notes, amount due. Guard: redirect to `../` if no active registration. Continue: validate `canRegister()`, save notes/payment → `../review` |
| `review/page.tsx`        | `/event/.../review`        | Read-only summary. Back → register/edit. Continue: if amount > 0 → `../${paymentId}/payment`; if 0 → complete                                                                                                       |
| `edit/page.tsx`          | `/event/.../edit`          | Like register but `mode="edit"`: existing fees disabled, only new fees toggleable. No countdown.                                                                                                                    |
| `registrations/page.tsx` | `/event/.../registrations` | View all registered players. Grid view for choosable events, list for non-choosable. Server component or client depending on real-time needs.                                                                       |

---

### 4.6: Stripe Payment Flow

**Install:** `pnpm --filter public-next add @stripe/stripe-js @stripe/react-stripe-js`

**Env var:** `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (already exists in `.env.development` as the test key)

**Create pages:**

| Page                            | Path                              | Key Behavior                                                                                                                                                           |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[paymentId]/layout.tsx`        | `/event/.../[paymentId]`          | `"use client"` — loads Stripe via `loadStripe()`, fetches stripe-amount, renders `<Elements>` provider with customer session                                           |
| `[paymentId]/payment/page.tsx`  | `/event/.../[paymentId]/payment`  | `<PaymentElement>` with accordion layout. Submit: validate → createPaymentIntent → confirmPayment. Navigation blocker (`onbeforeunload`), 2-min timeout, force cancel. |
| `[paymentId]/complete/page.tsx` | `/event/.../[paymentId]/complete` | Reads `payment_intent_client_secret` from URL params. `stripe.retrievePaymentIntent()` → shows success/processing/failed. Links to event registrations + home.         |

**Create hooks:**

- `lib/hooks/use-payment-timeout.ts` — timer that fires `onTimeout` after configurable duration when `isProcessing` is true
- `lib/hooks/use-stripe-amount.ts` — TanStack Query fetch of `/api/payments/${paymentId}/stripe-amount`

---

### 4.7: Manage Registration Pages

All under `app/event/[eventDate]/[eventName]/manage/`. All `"use client"`.

| Page               | Path                        | Purpose                                                                                             |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `layout.tsx`       | `/event/.../manage`         | Fetches player's existing registration. If none → message. Otherwise renders children.              |
| `page.tsx`         | `/event/.../manage`         | Menu: Add Players, Drop Players, Move Group (if canChoose), Replace Player, Add Notes, Get in Skins |
| `add/page.tsx`     | `/event/.../manage/add`     | Player picker → `editRegistration(registrationId, playerIds)` → navigate to `../../edit`            |
| `drop/page.tsx`    | `/event/.../manage/drop`    | Checkboxes for registered players → confirm → `DELETE /api/registration/:id/drop`                   |
| `move/page.tsx`    | `/event/.../manage/move`    | Course + available spots selector → `PUT /api/registration/:id/move`                                |
| `replace/page.tsx` | `/event/.../manage/replace` | Source player (radio) + target player (search) → swap                                               |
| `notes/page.tsx`   | `/event/.../manage/notes`   | Textarea + save → `PATCH /api/registration/:id`                                                     |

**Create `lib/hooks/use-manage-mutations.ts`**

- `useDropPlayers`, `useMovePlayers`, `useSwapPlayers`, `useUpdateNotes` mutations

---

### 4.8: Proxy Guard and Polish

**Modify `proxy.ts`** — add auth guard for registration sub-routes:

```typescript
const protectedEventPaths = ["/reserve", "/register", "/review", "/payment", "/manage", "/edit"]
if (pathname.startsWith("/event/") && protectedEventPaths.some((p) => pathname.includes(p))) {
	const token = request.cookies.get("access_token")
	if (!token) {
		return NextResponse.redirect(new URL("/sign-in", request.url))
	}
}
```

**Additional tests:** `lib/__tests__/correlation.test.ts`

---

## Dependency Graph

```
4.1 (Types/Utils) ──────┐
     │                    │
     v                    v
4.2 (State Mgmt)    4.3 (API Routes + SSE)
     │                    │
     └────────┬───────────┘
              v
     4.4 (Shared UI Components)
              │
              v
     4.5 (Flow Pages: Reserve → Register → Review → Edit)
              │
              v
     4.6 (Stripe Payment + Complete)
              │
     4.7 (Manage Pages) — can start after 4.3, parallel with 4.5/4.6
              │
              v
     4.8 (Proxy Guard + Polish)
```

## Key Files to Reference

| Reference                      | Path                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| Legacy registration reducer    | `apps/public/src/context/registration-reducer.ts`                       |
| Legacy registration provider   | `apps/public/src/context/registration-context-provider.tsx`             |
| Legacy registration context    | `apps/public/src/context/registration-context.tsx`                      |
| Legacy reserve model           | `apps/public/src/models/reserve.ts`                                     |
| Legacy payment model           | `apps/public/src/models/payment.ts`                                     |
| Legacy event fee model         | `apps/public/src/models/event-fee.ts`                                   |
| Legacy registration model      | `apps/public/src/models/registration.ts`                                |
| Legacy SSE hook                | `apps/public/src/hooks/use-registration-sse.ts`                         |
| Legacy SSE types               | `apps/public/src/types/sse.ts`                                          |
| Legacy reserve screen          | `apps/public/src/screens/registration/reserve.tsx`                      |
| Legacy register screen         | `apps/public/src/screens/registration/register.tsx`                     |
| Legacy payment screen          | `apps/public/src/screens/registration/payment.tsx`                      |
| Legacy complete screen         | `apps/public/src/screens/registration/registration-complete.tsx`        |
| Legacy manage screen           | `apps/public/src/screens/registration/manage-registration.tsx`          |
| Legacy event detail            | `apps/public/src/screens/registration/event-view.tsx`                   |
| Existing API proxy             | `apps/public-next/lib/api-proxy.ts`                                     |
| Existing types                 | `apps/public-next/lib/types.ts`                                         |
| Existing event utils           | `apps/public-next/lib/event-utils.ts`                                   |
| Existing auth context          | `apps/public-next/lib/auth-context.tsx`                                 |
| Existing friends hook          | `apps/public-next/lib/hooks/use-my-friends.ts`                          |
| NestJS registration controller | `apps/api/src/registration/controllers/user-registration.controller.ts` |
| NestJS payments controller     | `apps/api/src/registration/controllers/user-payments.controller.ts`     |
| NestJS SSE controller          | `apps/api/src/registration/controllers/registration-live.controller.ts` |

## Verification (Manual)

1. `docker compose up -d --build` — public-next container starts
2. Navigate to event detail → "Register" button appears when authenticated and signup is open
3. **Choosable event flow:** Register → Reserve → select tee time → Register → add players/fees → Review → Payment (Stripe test card `4242424242424242`) → Complete
4. **Non-choosable event flow:** Register → Register (skip reserve) → add players → Review → Payment → Complete
5. **SSE:** Open two browser tabs on the same event's reserve page — slot changes in one tab appear in real-time in the other
6. **Manage:** Register for event → navigate to manage → add notes, drop player
7. **Edit:** Manage → "Get in Skins" → edit fees → review → payment
8. **Cancel:** Start registration → cancel at register step → slots released
9. **Timeout:** Start registration → wait for countdown → auto-cancels
10. `pnpm --filter public-next test` — all unit tests pass
11. `pnpm --filter public-next build` — standalone build succeeds

---

## Sub-Phase 4.9: E2E Testing for Registration

### Context

Registration e2e tests face two challenges: (1) they need specific event configurations in the database, and (2) many flows are time-sensitive (priority registration windows, signup open/close, expiration timers). We solve both with a Django management command that creates test events with signup windows calculated relative to "now", so tests always start in the right state.

### Event Templates

Two event patterns to start:

**Template 1: Weeknight Individual** (choosable tee-time event with waves)
| Field | Value |
|-------|-------|
| event_type | `N` (Weeknight) |
| can_choose | `true` |
| start_type | `TT` (Tee Times) |
| group_size | 5 |
| min/max_signup_group_size | 1 / 5 |
| total_groups | 6 per course (18 total) |
| skins_type | `I` (Individual) |
| registration_type | `M` (Members Only) |
| signup_waves | 3 |
| courses | East, North, West |
| fees | Event Fee $5 (required), Gross Skins $5 (optional), Net Skins $5 (optional) |
| start_time | `3:00 PM` |
| starter_time_interval | 0 |
| team_size | 1 |

With `signup_waves=3` and 18 total groups, groups are distributed across 3 waves (6 groups per wave). During priority registration, wave 1 opens at `priority_signup_start`, wave 2 opens 1/3 through the priority window, and wave 3 opens 2/3 through.

**Template 2: Weekend Major Team** (non-choosable team event)
| Field | Value |
|-------|-------|
| event_type | `W` (Major) |
| can_choose | `false` |
| start_type | `TT` (Tee Times) |
| group_size | 4 |
| min/max_signup_group_size | 1 / 4 |
| total_groups | null |
| skins_type | `T` (Team) |
| registration_type | `M` (Members Only) |
| registration_maximum | 144 |
| courses | none |
| fees | Event Fee $10 (required), Gross Skins $10 (optional), Net Skins $10 (optional), Greens Fee $38 (optional) |
| start_time | `Morning Swing` |
| team_size | 2 |

### Time Scenarios

Each template is created in multiple variants with different time windows (all relative to `now`):

| Variant           | priority_signup_start | signup_start | signup_end | payments_end | Use Case                                    |
| ----------------- | --------------------- | ------------ | ---------- | ------------ | ------------------------------------------- |
| **normal-open**   | null                  | now - 30min  | now + 4hr  | now + 8hr    | Standard registration open                  |
| **priority-open** | now - 30min           | now + 2hr    | now + 4hr  | now + 8hr    | Priority window active, normal not yet open |
| **closed**        | now - 8hr             | now - 4hr    | now - 1hr  | now - 30min  | Registration closed                         |

### Django Management Command

**Create `backend/events/management/commands/seed_test_events.py`**

The command:

1. Deletes any prior test events (identified by name prefix `[E2E]`), including their slots, fees, registrations, and payments
2. Ensures the test player (email `finleysg@zoho.com`) is marked as `is_member=True` and `last_season=current_year`
3. Creates events from templates x time variants, with names like `[E2E] Weeknight Individual (normal-open)`
4. For choosable events, calls `RegistrationSlot.objects.create_slots_for_event(event)` to generate the tee-time grid
5. Outputs created event IDs and dates as JSON for Playwright to consume

Uses `--clean-only` flag to just delete test data without creating new events (for teardown).

Reference: existing command pattern at `backend/register/management/commands/cancel_expired.py`, slot creation logic at `backend/register/managers.py:242` (`create_slots_for_event`), existing fixtures at `backend/events/fixtures/event.yaml`.

### Playwright Test Infrastructure

**Create `e2e/global-setup.ts`**

Runs `docker exec bhmc-admin-backend-1 uv run python manage.py seed_test_events` via child_process, parses JSON output, writes results to `e2e/playwright/.test-events.json`.

**Create `e2e/fixtures/test-events.ts`**

Reads `e2e/playwright/.test-events.json` and exports typed event metadata (dates, names, URLs) for specs to consume. Provides `getTestEventUrl(variant)` helper.

**Modify `e2e/playwright.config.ts`**

- Add `globalSetup: require.resolve("./global-setup")`
- Add `public-next-registration` project:
  ```typescript
  {
    name: "public-next-registration",
    testMatch: /public-next\/registration.*\.spec\.ts/,
    dependencies: ["public-next-setup"],
    use: {
      baseURL: "http://localhost:3200",
      storageState: "playwright/.auth/user.json",
      ...devices["Desktop Chrome"],
    },
  }
  ```
- Exclude registration specs from the existing `public-next-authed` project pattern

### E2E Test Specs

**`e2e/public-next/registration-weeknight.spec.ts`** — Weeknight Individual (choosable)
| Test | Description |
|------|-------------|
| views event detail with register button | Navigate to normal-open event, verify detail renders, register button visible |
| completes full registration flow | Register → Reserve tee time → Add player + fees → Review → Payment (4242...) → Complete |
| cancels registration at register step | Reserve → Register → Cancel → Verify slots released |
| registration auto-cancels on timeout | Reserve → Register → Wait for expiration → Verify redirect |
| guest cannot access register page | Without auth, navigate to reserve → Redirected to sign-in |
| closed event shows no register button | Navigate to closed event → No register button visible |

**`e2e/public-next/registration-major.spec.ts`** — Weekend Major Team (non-choosable)
| Test | Description |
|------|-------------|
| completes non-choosable registration | Register (skips reserve) → Add team member → Fees → Review → Payment → Complete |
| manages existing registration | Register → Manage → Add notes → Verify notes saved |

**`e2e/public-next/registration-priority.spec.ts`** — Priority registration
| Test | Description |
|------|-------------|
| shows wave restrictions during priority | Navigate to priority-open weeknight event → Reserve page shows wave badges, some groups locked |

### Test Considerations

- **Stripe test mode**: Already configured in NestJS API (`sk_test_*` keys). Tests use card `4242424242424242` with any future expiry and any CVC.
- **Stripe webhook**: The Docker Stripe CLI service forwards webhooks to `api:3333`. After payment, wait for the "Registration Complete" page rather than polling slot status.
- **Test player membership**: The seed command sets `is_member=True` so the player can register for Members Only events. Current test user is player ID 159 (Paul Christenson, `finleysg@zoho.com`).
- **Cleanup**: The `globalSetup` re-seeds fresh data each run. The `[E2E]` name prefix ensures only test events are touched. No teardown needed.
- **Parallel safety**: Registration tests must NOT run in parallel with each other (they share the same test player). Use `test.describe.serial` or configure the registration project with `workers: 1`.
- **Event dates**: All test events use `start_date = today + 7 days` to avoid conflicting with real dev data. The seed command outputs the exact date for URL construction.

### E2E Files to Create/Modify

| File                                                     | Action |
| -------------------------------------------------------- | ------ |
| `backend/events/management/commands/seed_test_events.py` | Create |
| `e2e/global-setup.ts`                                    | Create |
| `e2e/fixtures/test-events.ts`                            | Create |
| `e2e/playwright.config.ts`                               | Modify |
| `e2e/public-next/registration-weeknight.spec.ts`         | Create |
| `e2e/public-next/registration-major.spec.ts`             | Create |
| `e2e/public-next/registration-priority.spec.ts`          | Create |

### E2E Verification

1. `docker compose up -d` — all services running
2. `docker exec bhmc-admin-backend-1 uv run python manage.py seed_test_events` — creates test events, outputs JSON with dates
3. Navigate to `http://localhost:3200` → find `[E2E]` events in calendar → verify they render with correct signup windows
4. `pnpm test:e2e -- --project=public-next-registration` — all registration specs pass
5. `pnpm test:e2e` — full suite passes (registration + existing specs)
