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
