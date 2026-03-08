---
name: e2e-testing
description: E2E test authoring guidance for Playwright tests. Triggers on: e2e test files, reserve.spec.ts, playwright config, test fixtures, beforeAll/afterAll patterns, browser.newContext, SSE testing, real-time updates.
---

# E2E Test Authoring

Tests live in `e2e/` and run with `pnpm test:e2e`. Config is at `e2e/playwright.config.ts`.

## Parallel vs Serial

The config sets `fullyParallel: true`. This means **every test can run in its own worker**, even tests in the same file. Each worker gets its own `beforeAll`/`afterAll`.

**If tests in a file share state via `beforeAll`** (e.g., creating a test event), you **must** add this at the file's top level:

```ts
test.describe.configure({ mode: "serial" })
```

Without it, parallel workers each run `beforeAll` independently and will conflict (e.g., 409 on duplicate event creation for the same date).

- **No shared state** (most tests): parallel is fine, no changes needed
- **Shared `beforeAll`/`afterAll` state**: always add `test.describe.configure({ mode: "serial" })`

## Authentication

The config defines three test projects, split by filename regex:

**`public-next-authed`** — matches `public-next/*.spec.ts` except filenames containing `guest`, `sign-in`, `sign-up`, `password-reset`, `reserve`, or `registration-guard`. These tests receive pre-authenticated cookies from `auth.setup.ts` (stored in `playwright/.auth/user.json`). **Do not sign in manually** — the session is already active via `testUser`.

**`public-next-self-auth`** — matches `reserve.spec.ts` and `registration-guard.spec.ts`. No stored auth state injected. Tests sign in manually using `getMember()` accounts. Use this project for any test that creates registrations or needs to control which user is authenticated.

**`public-next-guest`** — matches filenames with `guest`, `sign-in`, `sign-up`, or `password-reset`. No auth state injected.

**Multiple independent user sessions** — use `browser.newContext()` for each user and sign in manually:

```ts
test("multi-user test", async ({ browser }) => {
	const contextA = await browser.newContext()
	const contextB = await browser.newContext()
	const pageA = await contextA.newPage()
	const pageB = await contextB.newPage()

	// Sign in User A
	await pageA.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await pageA.getByLabel("Email").fill(getMember(1)!.email)
	await pageA.getByLabel("Password").fill(testPassword)
	await pageA.getByRole("button", { name: "Sign In" }).click()
	await pageA.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	try {
		// ... test body
	} finally {
		await contextA.close()
		await contextB.close()
	}
})
```

## Test Users

**CRITICAL: NEVER use `testUser` (finleysg@zoho.com) for tests that create registrations.** `testUser` is the project owner's account and is reserved exclusively for `auth.setup.ts` stored auth state.

**Always use `getMember(1-12)`** for tests that register players. The database enforces a `unique_player_registration` constraint on `(event_id, player_id)`, so each serial test in a file must use a **different member** to avoid duplicate-entry errors.

```ts
// Good: different member per test in a serial file
test("test 1", async ({ page }) => {
	const member = getMember(1)!
	// ... sign in and register as member 1
})

test("test 2", async ({ page }) => {
	const member = getMember(2)!
	// ... sign in and register as member 2
})
```

**Member allocation across specs:**

- `registration-guard.spec.ts` uses members 1–4
- `reserve.spec.ts` uses members 5–8
- Members 9–12 are available for new specs

When adding a new spec that creates registrations, pick a non-overlapping range to avoid cross-spec conflicts.

## Fixtures

All fixtures are in `e2e/fixtures/`.

| Export                               | Source             | Description                                                                                      |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| `testUser`                           | `test-accounts.ts` | Primary auth user (`finleysg@zoho.com`) — **only** for `auth.setup.ts` stored auth               |
| `testPassword`                       | `test-accounts.ts` | Shared password for all test/member accounts                                                     |
| `getMember(1–12)`                    | `test-accounts.ts` | Numbered test members (`member-01@test.bhmc.org` etc.), seeded by `global-setup.ts`              |
| `getTestUser(email)`                 | `test-accounts.ts` | Look up any test user by email                                                                   |
| `getAdminToken()`                    | `test-event.ts`    | Get admin auth token for API calls                                                               |
| `createTestEvent(token, templateId)` | `test-event.ts`    | Copy a template event with open registration. Always pair with `deleteTestEvent()` in `afterAll` |
| `deleteTestEvent(token, id)`         | `test-event.ts`    | Clean up test event (swallows errors)                                                            |
| `warmCacheAndVerify(url, name)`      | `test-helpers.ts`  | Revalidate Next.js cache and poll until event appears. **Throws** on failure.                    |

**Template event IDs:** 914 (Individual LG/LN), 915 (2 Man Best Ball), 916 (One Man Scramble)

**After creating an event**, use the shared `warmCacheAndVerify` helper:

```ts
import { warmCacheAndVerify } from "../fixtures/test-helpers"

test.beforeAll(async () => {
	token = await getAdminToken()
	testEvent = await createTestEvent(token, 914)
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})
```

## Selectors

**Prefer accessible selectors** — use `getByRole`, `getByLabel`, `getByText` over CSS selectors.

**Add `aria-label` to icon-only buttons and unlabeled form controls** so tests can target them reliably:

```tsx
// Component
;<Link href={prevUrl} aria-label="Previous month">
	<ChevronLeft />
</Link>

// Test
await page.getByRole("link", { name: "Previous month" }).click()
```

**Scope selectors when multiple elements match** — e.g., a "Home" link in the header, sidebar, and footer:

```ts
// Bad: matches 3 elements, strict mode fails
await page.getByRole("link", { name: "Home" }).click()

// Good: scoped to header
await page.locator("header").getByRole("link", { name: "Home" }).click()
```

**Use `data-slot` attributes over `[class*=...]` selectors** — CSS class names are unreliable with Tailwind; prefer `[data-slot='card']` or role-based selectors.

## Assertions

**For async/SSE/polling updates**, use `expect().toPass()` which retries until the assertion passes or times out:

```ts
await expect(async () => {
	const count = await page.getByRole("button", { name: "Open" }).count()
	expect(count).toBeLessThan(previousCount)
}).toPass({ timeout: 20_000 })
```

**For navigation**: `await page.waitForURL("**/register", { timeout: 10_000 })`

**For element readiness**: `await expect(button).toBeEnabled({ timeout: 30_000 })`

**For SSE debugging**, capture console logs:

```ts
const sseLogs: string[] = []
page.on("console", (msg) => {
	const text = msg.text()
	if (text.includes("[SSE]")) sseLogs.push(text)
})
```

## Common Pitfalls

- **Never use `waitForTimeout()`** — use `waitFor()`, `waitForURL()`, `toBeEnabled({ timeout })`, or `expect().toPass({ timeout })` instead
- **Never sign in manually in authed tests** — the stored auth state from `auth.setup.ts` is already injected
- **Never use `testUser` for registration tests** — use `getMember()` with a different member per serial test
- **Always use `test.describe.configure({ mode: "serial" })` when tests share `beforeAll` state** — `fullyParallel: true` will otherwise run each test in its own worker with its own `beforeAll`
- **Always clean up test events** — call `deleteTestEvent()` in `afterAll`
- **Always close custom browser contexts** — use a `try`/`finally` block
- **Always use `warmCacheAndVerify()`** after creating a test event — it throws on failure instead of silently proceeding
- **Use 30s timeouts for SSE readiness** — SSE connections can take time to establish, especially under load
- **Add `aria-label` to icon-only links/buttons** — avoid brittle `.or()` fallback selectors

**CRITICAL:** All tests must pass without flakiness when run from `pnpm test:e2e`. It is not good enough for a test to run and pass in isolation.
