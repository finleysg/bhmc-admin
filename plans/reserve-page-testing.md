# Testing Strategy for /reserve Page

## Context

The /reserve page handles tee-time selection with wave-based registration, SSE real-time updates, and time-gated access. Not all features in this list are implemented yet — this plan categorizes test cases and describes the testing approach for each, to be built as features land.

## Test Cases (easiest to hardest)

### 1. Subscribe to SSE on landing — Unit only

Mock `EventSource` globally. Assert it's constructed with `/api/registration/{eventId}/live` when `enabled=true`.

- File: new `lib/__tests__/use-registration-sse.test.ts`

### 2. Unsubscribe on navigate away — Unit only

Same mock setup as above. Render hook, unmount, assert `EventSource.close()` called and retry timeouts cleared.

- File: `lib/__tests__/use-registration-sse.test.ts`

### 3. Select slots in one tee time only — Both

- **Unit**: Test `handleSelect` logic — selecting a slot in group B clears selections from group A. Extract selection logic to a pure function or test via component rendering.
- **E2E**: Click a slot in one tee time, then click a slot in a different tee time. Verify the first selection is cleared.
- Files: new `lib/__tests__/reserve-grid-selection.test.ts`, `e2e/public-next/reserve.spec.ts`

### 4. Wave slots controlled by SSE — Unit only

- Test the reducer: `update-sse-wave` action sets `sseCurrentWave` correctly.
- Test `transformSSESlots` converts NestJS camelCase to Django snake_case.
- File: existing `lib/__tests__/registration-reducer.test.ts` (add cases), `lib/__tests__/reserve-utils.test.ts`

### 5. Any size group after priority — Both

- **Unit**: `canRegister()` returns `true` when `filledCount >= 1` after `signup_start`. Simple date/count setup.
- **E2E**: After priority window closes, register a single player and verify Register action is enabled.
- Files: `lib/__tests__/registration-reducer.test.ts` (or new provider test), `e2e/public-next/reserve.spec.ts`

### 6. Min group size during priority — Both

- **Unit**: `canRegister()` returns `false` when `filledCount < minimum_signup_group_size` during priority window (between `priority_signup_start` and `signup_start`).
- **E2E**: During priority registration, add fewer than min players. Verify Register button stays disabled. Add enough players and verify it enables.
- Files: same as #5

### 7. Tee sheet unavailable before registration opens — Both

- **Unit**: `getAvailabilityMessage` returns "Opens at..." for all groups when `sseCurrentWave` is -1 or null. Extend existing tests in `reserve-utils.test.ts`.
- **E2E**: Navigate to reserve page before registration opens. Verify all slots show as locked with "Opens at" labels and `opacity-50` styling.
- Files: `lib/__tests__/reserve-utils.test.ts` (extend), `e2e/public-next/reserve.spec.ts`

### 8. Cannot reach /reserve until 1hr before priority registration — Both

- **Unit**: `shouldShowSignUpButton` returns `false` when `now` is >60 min before `priority_signup_start`. Already partially covered — extend with priority start edge cases.
- **E2E**: Navigate to event where registration opens >1hr from now. Verify no Sign Up button. Navigate directly to `/reserve` URL and verify redirect to event detail page (`page.tsx` checks `can_choose` and timing).
- Files: `lib/__tests__/event-utils.test.ts` (extend), `e2e/public-next/reserve.spec.ts`

### 9. Non-member cannot register — E2E only

Log in as a non-member test user, navigate to an event with open registration, and verify the Sign Up button is absent. Navigate directly to `/reserve` URL and verify redirect or error.

- File: `e2e/public-next/reserve.spec.ts`
- Requires: non-member test user in seeded data, event with current registration window.

### 10. SSE fallback with subtle indicator — Both

- **Unit**: After `MAX_RETRIES` (5) exhausted, hook stops retrying and signals fallback state via callback.
- **E2E**: Block/stub SSE endpoint (e.g., route intercept). Verify page loads with initial slot data and a subtle indicator shows SSE is disconnected.
- Files: `lib/__tests__/use-registration-sse.test.ts`, `e2e/public-next/reserve.spec.ts`
- Note: fallback indicator UI may not be implemented yet.

### 11. Pulsing 15s before wave opens — Both

- **Unit**: Timing logic — given `waveUnlockTimes` and `now`, determine which groups should pulse (within 15s of unlock). Needs a new pure function.
- **E2E**: During wave registration, verify CSS pulse animation on upcoming wave's slots. Verify pulsing stops and slots become available when wave unlocks.
- Files: new util function + test in `reserve-utils.test.ts`, `e2e/public-next/reserve.spec.ts`
- Note: pulsing animation may not be implemented yet.

### 12. Real-time updates from other members — E2E only

Open two Playwright browser contexts with two authenticated members. Member A reserves a slot. Verify Member B's page updates to show that slot as taken without a manual refresh (via SSE broadcast).

- File: `e2e/public-next/reserve.spec.ts`
- Requires: two member test users, event with open registration and `can_choose=true`.
- Most complex: multi-browser coordination, SSE timing, potential flakiness.

---

## Summary Table (by complexity)

| Order | Test Case                                 | Unit | E2E | Complexity |
| :---: | ----------------------------------------- | :--: | :-: | :--------: |
|   1   | Subscribe to SSE on landing               |  x   |     |    Low     |
|   2   | Unsubscribe on navigate away              |  x   |     |    Low     |
|   3   | Select slots in one tee time only         |  x   |  x  |    Low     |
|   4   | Wave slots controlled by SSE              |  x   |     |    Low     |
|   5   | Any size group after priority             |  x   |  x  |   Medium   |
|   6   | Min group size during priority            |  x   |  x  |   Medium   |
|   7   | Tee sheet unavailable before registration |  x   |  x  |   Medium   |
|   8   | Cannot reach /reserve until 1hr before    |  x   |  x  |   Medium   |
|   9   | Non-member cannot register                |      |  x  |   Medium   |
|  10   | SSE fallback with indicator               |  x   |  x  |    High    |
|  11   | Pulsing 15s before wave opens             |  x   |  x  |    High    |
|  12   | Real-time updates from other members      |      |  x  |    High    |

## New Test Files

| File                                         | Type | What it covers                                                |
| -------------------------------------------- | ---- | ------------------------------------------------------------- |
| `lib/__tests__/use-registration-sse.test.ts` | Unit | Cases 1, 2, 4, 10 — SSE hook lifecycle, retry, fallback       |
| `e2e/public-next/reserve.spec.ts`            | E2E  | Cases 3, 5, 6, 7, 8, 9, 10, 11, 12 — full /reserve page flows |

## Existing Files to Extend

| File                                         | Cases                                                             |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `lib/__tests__/event-utils.test.ts`          | Case 8 — `shouldShowSignUpButton` with priority start             |
| `lib/__tests__/reserve-utils.test.ts`        | Cases 4, 7, 11 — transform, availability messages, pulsing timing |
| `lib/__tests__/registration-reducer.test.ts` | Cases 4, 5, 6 — `update-sse-wave`, `canRegister` logic            |

## Key Existing Code to Reuse

- `shouldShowSignUpButton()` — `lib/event-utils.ts:173`
- `getAvailabilityMessage()` — `lib/registration/reserve-utils.ts`
- `calculateWave()`, `getWaveUnlockTimes()` — `lib/registration/reserve-utils.ts`
- `canRegister()` — `lib/registration/registration-provider.tsx:530`
- `useRegistrationSSE()` — `lib/hooks/use-registration-sse.ts`
- `registrationReducer` — `lib/registration/registration-reducer.ts`
- `transformSSESlots()` — `lib/registration/reserve-utils.ts`
- Factory functions: `makeEvent()` in `event-utils.test.ts`, `makeSlot()` in `reserve-utils.test.ts`
- E2E fixtures: `getMember()`, `testUser` from `e2e/fixtures/test-accounts.ts`

## Verification

- Unit: `pnpm --filter public-next test`
- E2E: `pnpm playwright test --project=public-next-authed` and `--project=public-next-guest`
- Lint/types: `pnpm lint && pnpm typecheck`

## Test Data

### Users

Use test users created for this purpose.

**NOTE:** Use finleysg@gmail.com only when testing administrator functions.

### Events

Create test events from one of the following templates:

- 914: Test - Individual LG/LN (for testing with canChoose events - players select their slots)
- 915: Test - 2 Man Best Ball (for testing with weekend events and team events)
- 916: Test - One Man Scramble (for testing with open events)

Use the copy endpoint here:

```
curl --location --request POST 'http://localhost:8000/api/event{eventId}/copy_event/?start_dt={yyyy-mm-dd}' \
--header 'Authorization: Token {token}'
```

where the eventId is the source event and the start_dt is the date for the newly created event.

When you must use an admin's authorization token, which you can get either by logging in as `finleysg@gmail.com` or from the database: `SELECT key FROM authtoken_token WHERE user_id = 1` .

**IMPORTANT:** Times are stored in UTC in the database, but rendered in local time in the UI (typically central time).

#### Teesheet

When you create a test event with id 914, you also need to create the teesheet. Use this endpoint: `http://localhost:8000/api/event{eventId}/create_slots/`

**TODO:** we should have a way to clean up test data
