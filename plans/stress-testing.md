# Stress Testing the Public-Next Registration Flow

## Context

During event registration, 80-100 users may hit the site simultaneously (e.g., when signup opens). The critical path is:

1. `POST /registration` — reserves slots with `FOR UPDATE` row locks
2. `PUT /registration/:id/add-players` — assigns players with duplicate checks in a transaction
3. `POST /payments` + `POST /payments/:id/payment-intent` — Stripe payment creation

The main bottleneck is **transaction lock contention** on `registration_slot` during concurrent `createAndReserve()` calls — every reservation locks rows with `FOR UPDATE`.

No load testing tools exist in the project today.

---

## Plan: k6 for API Load + Playwright for Browser Smoke

### Part 1: k6 API Stress Tests

**Install:** `brew install k6`

**Create:** `e2e/load/registration-stress.js`

**Scenarios:**

1. **Slot Reservation Stampede** — 100 VUs simultaneously `POST /registration` to reserve slots. Measures lock contention, p95 latency, 409/500 error rates.

2. **Full Registration Flow** — 50 VUs walk through reserve → add players → create payment → payment intent. Measures end-to-end completion rate and Stripe latency.

3. **Player Search Under Load** — 100 concurrent `GET /players/search?pattern=...` (friend picker autocomplete). Tests DB LIKE query performance.

**Config:**

```javascript
export const options = {
	scenarios: {
		stampede: {
			executor: "shared-iterations",
			vus: 100,
			iterations: 100,
			maxDuration: "2m",
		},
		full_flow: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "30s", target: 50 },
				{ duration: "2m", target: 50 },
				{ duration: "30s", target: 0 },
			],
			startTime: "3m", // runs after stampede
		},
	},
	thresholds: {
		http_req_duration: ["p(95)<3000"],
		http_req_failed: ["rate<0.05"],
	},
}
```

**Test data setup:**

- Create a test event with 120+ available slots via admin API
- Use existing player records (or create test players in a setup script)
- Authenticate each VU via `POST /auth/login` in the `setup()` function

### Part 2: Playwright Browser Smoke Under Load

**Create:** `e2e/load/registration-browser.spec.ts`

Run 10-15 parallel Playwright workers through the actual UI flow while k6 is hammering the API. This validates:

- UI remains responsive under backend load
- Error states display correctly (e.g., slot-taken toast)
- SSR pages still render within acceptable time
- No JS errors or blank screens

**Config** (separate playwright config for load):

```typescript
// e2e/load/playwright.load.config.ts
export default defineConfig({
	workers: 15,
	timeout: 120_000,
	use: { baseURL: "http://localhost:3200" },
})
```

### Part 3: What to Monitor During Tests

- **MySQL:** `SHOW PROCESSLIST` — watch for lock waits, long-running queries
- **API logs:** `docker compose logs -f api` — 409s, 500s, transaction deadlocks
- **Docker stats:** `docker stats` — CPU/memory on api and mysql containers
- **k6 output:** p95/p99 latency, error rate, requests/sec throughput

### Target

Run against local Docker Compose stack:

- API: `localhost:3333`
- Public-next: `localhost:3200`

---

## Files to Create

| File                                    | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `e2e/load/registration-stress.js`       | k6 script with stampede + full flow scenarios   |
| `e2e/load/helpers.js`                   | Shared k6 helpers (auth, test data)             |
| `e2e/load/registration-browser.spec.ts` | Playwright parallel browser smoke               |
| `e2e/load/playwright.load.config.ts`    | Playwright config for load testing (15 workers) |
| `e2e/load/README.md`                    | How to run the tests, what to look for          |

## Key Files to Reference

| File                                                                    | Why                                    |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `apps/api/src/registration/services/registration.service.ts`            | Transaction logic, lock patterns       |
| `apps/api/src/registration/controllers/user-registration.controller.ts` | API endpoints to target                |
| `apps/public-next/app/event/[eventDate]/[eventName]/register/page.tsx`  | UI entry point                         |
| `e2e/public-next/registration-payment.spec.ts`                          | Existing flow to base browser tests on |

## Verification

1. `brew install k6` then `k6 run e2e/load/registration-stress.js`
2. In a separate terminal: `npx playwright test --config e2e/load/playwright.load.config.ts`
3. Check k6 summary: p95 < 3s, error rate < 5%
4. Check Playwright: all 15 workers complete without crashes
5. Query DB after: no orphaned PENDING slots, no double-booked players
