# Manage My Registration — Port from Public to Public-Next

## Context

The "Manage My Registration" feature exists in the React SPA (`apps/public`) and allows registered players to modify their group after signing up for an event. It needs to be ported to the Next.js 16 app (`apps/public-next`). The Manage button already renders in public-next's `RegistrationActions` component and links to `/event/{date}/{name}/manage`, but no page exists at that route yet.

---

## 1. Business Rules by Capability

### Visibility — When "Manage" appears

- Player has signed up for the event (`hasSignedUp`)
- `payments_end` is set and current time is before it
- Registration window is not `"past"`
- **Already implemented** in `apps/public-next/.../registration-actions.tsx:90-112`

### Add Players

- Deadline: signup end
- Available slots calculation:
  - **Choosable events**: count empty slots at the same hole/starting order (open slots from API)
  - **Non-choosable events**: `maximum_signup_group_size - current_player_count`
- If 0 slots available, show "No available slots" message
- Excluded: players already registered for the event
- Members-only enforcement if event `registration_type` is `MembersOnly` or `ReturningMembersOnly`
- After adding, enters the **edit registration payment flow** (register step → review → payment) to collect fees for new players
- API: `PUT /registration/{id}/add-players` with `{ players: [{ id }] }`

### Drop Players

- Deadline: signup end
- Select 1+ players from current group via checkbox list
- Confirmation dialog required before executing
- After drop:
  - If dropping yourself OR dropping all players → navigate to event detail page
  - Otherwise → return to manage menu
- Refund auto-triggered server-side for dropped players' paid fees
- API: `DELETE /registration/{id}/drop/` with `{ source_slots: [slotIds] }`

### Move Group

- Deadline: signup end
- **Only available** if `event.can_choose === true`
- Step 1: Select course from event's courses
- Step 2: Select available starting spot (must have enough empty slots for entire group)
- API: `PUT /registration/{id}/move/` with `{ source_slots: [slotIds], destination_slots: [slotIds] }`

### Replace Player

- Deadline: payments end
- Step 1: Select one player from current group to replace
- Step 2: Search for replacement player (same search/picker as registration)
- Replacement must not already be registered; members-only filter applies
- API: `PATCH /registration/slots/{slotId}` with `{ playerId }`

### Add Notes

- Deadline: signup end
- Free text textarea
- Only submits if text changed from initial value
- API: `PATCH /registration/{id}` with `{ notes }`

### Get in Skins (Update Registration)

- Deadline: payments end
- Loads current registration into the RegistrationProvider
- Initiates Stripe customer session
- Navigates to the edit registration flow (register → review → payment)
- Allows adding optional fees (skins, etc.)

---

## 2. Visual Layouts

### Manage Menu (main page)

```
┌─────────────────────────────────────┐
│  Manage My Group                    │
│  (Course Name — Starting Spot)      │
│─────────────────────────────────────│
│  ▸ Add Players                      │
│    Add one or more players to your  │
│    group, assuming space available  │
│                                     │
│  ▸ Drop Players                     │
│    Drop one or more players...      │
│                                     │
│  ▸ Move Group          (if canChoose│
│    Move your group to another spot  │
│                                     │
│  ▸ Replace Player                   │
│    Replace one of the players...    │
│                                     │
│  ▸ Add Notes                        │
│    Add a special request or notes   │
│                                     │
│  ▸ Get in Skins                     │
│    Pay for skins or other extras    │
│─────────────────────────────────────│
│                          [Back]     │
└─────────────────────────────────────┘
```

- Card layout with max-width ~560px (matching existing registration flow)
- Each option: clickable title (link-style) + muted italic description below
- "Move Group" hidden when `!event.can_choose`

### Sub-screens (Add, Drop, Move, Replace, Notes)

Each is a card with:

- Title header
- Form content area (specific to each action)
- Footer with `[Back]` and `[Action]` buttons, right-aligned
- Action button disabled until valid selection made
- Loading/submitting state disables all buttons

### Component patterns (matching public-next conventions):

- shadcn/ui `Card`, `CardHeader`, `CardContent`, `CardFooter`
- shadcn/ui `Button` variants
- `AlertDialog` for drop confirmation
- `PlayerPicker` (already exists in public-next) for search
- `Command`-based search for player selection
- `Sonner` toast for success/error notifications

---

## 3. Code Reuse Analysis

### Already exists in public-next — REUSE directly

| What                     | File                                                              | Notes                                                               |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Manage button visibility | `registration-actions.tsx:90-112`                                 | Already renders and links to `/manage`                              |
| Player search/picker     | `components/player-picker.tsx`                                    | Reuse for Add Players + Replace Player                              |
| Registration context     | `lib/registration/registration-provider.tsx`                      | Has `loadRegistration`, `editRegistration`, `initiateStripeSession` |
| Player registration hook | `lib/hooks/use-player-registration.ts`                            | Fetches current registration                                        |
| Event detail types       | `lib/types.ts` (`ClubEventDetail`, `ServerRegistration`, etc.)    | All types available                                                 |
| Event utilities          | `lib/event-utils.ts` (`isPaymentsOpen`, `RegistrationType`, etc.) | Reuse for business logic                                            |
| API proxy routes         | `app/api/registration/[id]/drop/route.ts`                         | Already proxies to Django                                           |
| API proxy routes         | `app/api/registration/[id]/move/route.ts`                         | Already proxies to Django                                           |
| API proxy routes         | `app/api/registration/[id]/add-players/route.ts`                  | Already proxies to Django                                           |
| API proxy routes         | `app/api/registration/[id]/route.ts` (PATCH)                      | For notes update                                                    |
| API proxy routes         | `app/api/registration/slots/[id]/route.ts` (PATCH)                | For replace player                                                  |
| Event layout + wrapper   | `layout.tsx` → `EventRegistrationWrapper`                         | RegistrationProvider already wraps `/event/*`                       |
| UI components            | `components/ui/*` (Card, Button, AlertDialog, Command)            | shadcn/ui library                                                   |
| Auth context             | `lib/auth-context.tsx`                                            | `useAuth()` for user info                                           |
| My player hook           | `lib/hooks/use-my-player.ts`                                      | Gets current player                                                 |
| Friend picker            | `components/friend-picker.tsx`                                    | Could reuse for quick player adds                                   |

### Needs new code — build fresh

| What                                 | Why                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Manage menu page                     | New Next.js page component                                                     |
| Add Players sub-page                 | New — needs open slots API call + player picker integration                    |
| Drop Players sub-page                | New — needs registered player checkbox list + confirmation                     |
| Move Group sub-page                  | New — needs course selector + available spots selector                         |
| Replace Player sub-page              | New — needs two-step selection UI                                              |
| Add Notes sub-page                   | New — simple textarea form                                                     |
| Registered player selector component | New — checkbox list of players in current registration                         |
| Available spots selector component   | New — for Move Group (course selector + spot grid/list)                        |
| `useOpenSlots` hook                  | New — fetches available slots at a specific hole/starting order                |
| API route for open slots             | May need `/api/registration/[eventId]/open-slots` proxy if not already covered |

### Risk assessment — shared code changes

**LOW RISK** — The existing registration flow (`reserve → register → review → payment → complete`) is NOT modified. All manage actions are new pages/components that:

- Read from existing API endpoints (already proxied)
- Use existing hooks read-only (no mutations added to shared hooks)
- Navigate into the existing edit flow only for "Add Players" and "Get in Skins"

**MEDIUM RISK** — The "Add Players" and "Get in Skins" flows reuse `RegistrationProvider`'s `editRegistration` and `loadRegistration` + `initiateStripeSession`. These are already implemented and tested in the registration flow. However, triggering them from a manage context (vs. the normal flow) should be tested carefully.

**Recommendation**: Create all manage-specific code as new files. Do not modify existing registration flow files. The only existing file that gets a minor touch is adding route awareness (the manage pages are new Next.js route segments under the existing event layout).

---

## 4. Migration Plan

### Phase 1: Foundation (manage menu + notes)

1. Create `app/event/[eventDate]/[eventName]/manage/page.tsx` — manage menu
2. Create `app/event/[eventDate]/[eventName]/manage/layout.tsx` — loads registration, guards auth
3. Create `app/event/[eventDate]/[eventName]/manage/notes/page.tsx` — add notes sub-page
4. Create shared hook: `lib/hooks/use-manage-registration.ts` — wraps `usePlayerRegistration` with guard logic

### Phase 2: Drop + Replace

5. Create `RegisteredPlayerSelector` component — checkbox list of group members
6. Create `manage/drop/page.tsx` — drop players
7. Create `manage/replace/page.tsx` — replace player (uses existing `PlayerPicker` + new `RegisteredPlayerSelector`)

### Phase 3: Add Players

8. Create `manage/add/page.tsx` — add players (uses `PlayerPicker`, calculates available slots)
9. Wire "Continue" to navigate into `editRegistration` → payment flow
10. May need API route for open slots query (check if existing endpoints cover this)

### Phase 4: Move Group

11. Create course selector component (or reuse if one exists)
12. Create available spots selector component
13. Create `manage/move/page.tsx` — move group

### Phase 5: Get in Skins

14. Wire "Get in Skins" action to `loadRegistration` + `initiateStripeSession` + navigate to edit flow
15. Test the full payment flow from the manage context

### File structure:

```
apps/public-next/app/event/[eventDate]/[eventName]/manage/
├── layout.tsx                    (auth guard + registration loader)
├── page.tsx                      (manage menu)
├── components/
│   ├── registered-player-selector.tsx
│   └── available-spots-selector.tsx
├── add/
│   └── page.tsx
├── drop/
│   └── page.tsx
├── move/
│   └── page.tsx
├── replace/
│   └── page.tsx
└── notes/
    └── page.tsx
```

---

## 5. Testing Plan

### Unit Tests (Jest)

| Test                                  | What to verify                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `manage/page.test.tsx`                | Menu renders all 6 options; "Move Group" hidden when `!can_choose`; correct links                                   |
| `registered-player-selector.test.tsx` | Renders player names from registration slots; checkbox selection works; excludes empty slots                        |
| `manage/notes/page.test.tsx`          | Textarea renders with initial notes; Save disabled when unchanged; calls PATCH API                                  |
| `manage/drop/page.test.tsx`           | Player list renders; Drop button disabled until selection; confirmation dialog appears                              |
| `manage/replace/page.test.tsx`        | Two-step flow: select source → select target; Replace disabled until both selected                                  |
| `manage/add/page.test.tsx`            | Shows "No available slots" when 0 slots; player picker respects member-only filter; Continue navigates to edit flow |

### E2E Tests (Playwright)

#### Infrastructure & Test Data Setup

**Test fixture**: Create `e2e/fixtures/test-registration.ts` — a helper that programmatically registers a group for a test event via the NestJS admin API. This avoids repeating the full UI registration flow in every test's setup.

```
createTestRegistration(token, eventId, members[])
  1. GET /registration/{eventId}/available-slots?courseId=...&players=N  (admin API on NestJS :3333)
  2. POST /registration/{eventId}/reserve-admin-slots  [slotIds]
  3. POST /registration/{eventId}/admin-registration  { userId, signedUpBy, slots, collectPayment: false, ... }
  Returns: { registrationId, slotIds[], holeId, startingOrder }
```

This calls the NestJS admin API (`http://localhost:3333/registration/...`) directly with the admin token. Setting `collectPayment: false` avoids Stripe and puts slots directly into RESERVED status.

**Cleanup**: `deleteTestEvent(token, eventId)` in `afterAll` (already exists) — force-deleting the event cascades to registrations and slots.

#### Spec File Organization

**File**: `e2e/public-next/manage-registration.spec.ts`

**Execution mode**: `test.describe.configure({ mode: "serial" })` — **must be serial**, not parallel, because:

1. Tests share a single test event (created once in `beforeAll` for speed)
2. Mutations in one test change the registration state for subsequent tests (drop removes players, replace swaps them, move changes position)
3. The manage flow depends on the player being registered — tests that drop the player break subsequent tests if run in parallel
4. Using a single event date (+8 days out) avoids collisions with the 4 other registration spec files (which use +1, +2, +5, +7 days)

**Project**: Add to the `public-next-self-auth` project in `playwright.config.ts` (these tests handle their own auth, like the other registration specs).

#### Test Setup

```typescript
// beforeAll:
// 1. Get admin token
// 2. Create test event (+8 days, template 914, choosable)
// 3. Warm cache
// 4. Register member-01 with a 3-player group (member-01, member-02, member-03) via admin API
//    → Store registrationId for use in tests
//
// afterAll:
// 5. Delete test event (cascades registrations)
```

Using members 1–3 for the group leaves members 4–12 available as replacement/add targets without conflicting with other spec files (which use members 9–12).

#### Test Scenarios (ordered for serial execution)

Tests are ordered so that state mutations flow logically — non-destructive tests first, destructive tests last.

| #   | Test                              | Precondition                       | Mutates state?                            |
| --- | --------------------------------- | ---------------------------------- | ----------------------------------------- |
| 1   | **Menu renders with all options** | Group registered                   | No                                        |
| 2   | **Add Notes**                     | Group registered                   | Yes (notes field only)                    |
| 3   | **Replace Player**                | member-02 in group                 | Yes (swaps member-02 → member-04)         |
| 4   | **Move Group**                    | Group at original spot             | Yes (moves to different hole)             |
| 5   | **Add Players**                   | Group has empty slot after replace | Yes (adds member-05, enters payment flow) |
| 6   | **Drop Player (not self)**        | member-03 still in group           | Yes (drops member-03)                     |
| 7   | **Drop Self**                     | member-01 still registered         | Yes (drops self, redirects to event page) |

#### Detailed Test Steps

**Test 1: Menu renders with all options**

```
GIVEN: member-01 signed in, navigated to event manage page
WHEN: page loads
THEN:
  - "Manage My Group" heading visible
  - All 6 action links visible (Add Players, Drop Players, Move Group, Replace Player, Add Notes, Get in Skins)
  - Back button navigates to event detail
```

**Test 2: Add Notes**

```
GIVEN: on manage menu
WHEN: click "Add Notes" → type "Please pair us with group on hole 5" → click Save
THEN:
  - Success toast appears
  - Redirected back to manage menu
  - Click "Add Notes" again → textarea shows saved notes
```

**Test 3: Replace Player**

```
GIVEN: on manage menu, member-02 in group
WHEN: click "Replace Player" → select member-02 → search for member-04 → click member-04 → click Replace
THEN:
  - Success toast "member-02 replaced by member-04"
  - Redirected back to manage menu
  - (member-04 now in group, member-02 available)
```

**Test 4: Move Group**

```
GIVEN: on manage menu, choosable event
WHEN: click "Move Group" → select course → select different available spot → click Move
THEN:
  - Success toast with new location
  - Redirected back to manage menu
  - Menu header shows updated starting spot
```

**Test 5: Add Players**

```
GIVEN: on manage menu, group has open slot(s)
WHEN: click "Add Players" → search for member-05 → select → click Continue
THEN:
  - Navigated to register/edit page (payment flow entry)
  - "Players and Fees" heading visible
  - member-05 appears in the slot list
  NOTE: We do NOT complete payment — just verify the flow entry point works
  → Navigate back to manage menu for remaining tests
```

**Test 6: Drop Player (not self)**

```
GIVEN: on manage menu, member-03 in group
WHEN: click "Drop Players" → check member-03 → click Drop → confirm dialog
THEN:
  - Success toast "1 player(s) dropped"
  - Redirected back to manage menu (still have other players)
```

**Test 7: Drop Self**

```
GIVEN: on manage menu, member-01 is self
WHEN: click "Drop Players" → check member-01 → click Drop → confirm dialog
THEN:
  - Success toast
  - Redirected to event detail page (NOT manage menu)
  - "Manage" button no longer visible (no registration)
```

#### Considerations

- **Date offset**: Use `+8 days` to avoid collisions with existing specs (+1 reserve, +2 guard, +5 payment, +7 duplicate)
- **Member allocation**: Use members 1–5 (leaving 6–12 for other spec files). Members 9–12 are already used by payment/duplicate specs.
- **Test timeout**: Set `test.setTimeout(90_000)` per test — admin API registration is fast but cache warming + SSE readiness take time
- **No Stripe in these tests**: All manage actions (except Get in Skins) don't touch Stripe. For Add Players test, we only verify entry into the payment flow without completing payment.
- **Get in Skins**: Skip as a full E2E test — it's identical to the existing registration-payment flow once triggered. Verify only that the button navigates to the edit flow (can be covered in Test 5's pattern or as a lightweight check in Test 1).
- **Browser auth**: Each test signs in as member-01 at the start. Use `test.describe.configure({ mode: "serial" })` so the browser context (and auth cookies) persist across sequential tests within the describe block — only need to sign in once.

### Manual verification checklist:

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm test` passes
4. `pnpm build` passes
5. Rebuild container, navigate to http://localhost:3200
6. Sign in as a member with an active registration
7. Walk through each manage action visually
8. Verify toast notifications appear on success/error
9. Verify navigation (back buttons, post-action redirects)

---

## 6. Key Files Reference

### Existing files to reuse (NOT modify)

- `apps/public-next/app/event/[eventDate]/[eventName]/components/registration-actions.tsx` — Manage button
- `apps/public-next/app/event/[eventDate]/[eventName]/components/player-picker.tsx` — Player search
- `apps/public-next/app/event/[eventDate]/[eventName]/event-registration-wrapper.tsx` — RegistrationProvider wrapper
- `apps/public-next/app/event/[eventDate]/[eventName]/layout.tsx` — Event layout
- `apps/public-next/lib/registration/registration-provider.tsx` — Registration context (editRegistration, loadRegistration, initiateStripeSession)
- `apps/public-next/lib/hooks/use-player-registration.ts` — Fetch player's registration
- `apps/public-next/lib/hooks/use-my-player.ts` — Current player hook
- `apps/public-next/lib/event-utils.ts` — Event utilities
- `apps/public-next/lib/types.ts` — All shared types
- `apps/public-next/lib/registration/types.ts` — Registration flow types

### Existing API routes (already proxied)

- `app/api/registration/[id]/drop/route.ts` — DELETE
- `app/api/registration/[id]/move/route.ts` — PUT
- `app/api/registration/[id]/add-players/route.ts` — PUT
- `app/api/registration/[id]/route.ts` — PATCH (notes)
- `app/api/registration/slots/[id]/route.ts` — PATCH (replace player)

### Source reference (public SPA — port from)

- `apps/public/src/screens/registration/manage-registration.tsx` — Menu + wrapper
- `apps/public/src/screens/registration/add-players.tsx`
- `apps/public/src/screens/registration/drop-players.tsx`
- `apps/public/src/screens/registration/move-group.tsx`
- `apps/public/src/screens/registration/replace-player.tsx`
- `apps/public/src/screens/registration/add-notes.tsx`
- `apps/public/src/components/buttons/manage-registration-button.tsx`
