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

The config defines two test projects, split by filename regex:

**`public-next-authed`** — matches `public-next/*.spec.ts` except filenames containing `guest`, `sign-in`, `sign-up`, or `password-reset`. These tests receive pre-authenticated cookies from `auth.setup.ts` (stored in `playwright/.auth/user.json`). **Do not sign in manually** — the session is already active via `testUser`.

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

## Fixtures

All fixtures are in `e2e/fixtures/`.

| Export                               | Source             | Description                                                                                      |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| `testUser`                           | `test-accounts.ts` | Primary auth user (`finleysg@zoho.com`) — used by `auth.setup.ts`                                |
| `testPassword`                       | `test-accounts.ts` | Shared password for all test/member accounts                                                     |
| `getMember(1–12)`                    | `test-accounts.ts` | Numbered test members (`member-01@test.bhmc.org` etc.), seeded by `global-setup.ts`              |
| `getTestUser(email)`                 | `test-accounts.ts` | Look up any test user by email                                                                   |
| `getAdminToken()`                    | `test-event.ts`    | Get admin auth token for API calls                                                               |
| `createTestEvent(token, templateId)` | `test-event.ts`    | Copy a template event with open registration. Always pair with `deleteTestEvent()` in `afterAll` |
| `deleteTestEvent(token, id)`         | `test-event.ts`    | Clean up test event (swallows errors)                                                            |

**Template event IDs:** 914 (Individual LG/LN), 915 (2 Man Best Ball), 916 (One Man Scramble)

**After creating an event**, invalidate the Next.js cache and warm it:

```ts
test.beforeAll(async () => {
	token = await getAdminToken()
	testEvent = await createTestEvent(token, 914)

	await fetch(`${PUBLIC_NEXT_URL}/api/revalidate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tag: "events" }),
	})

	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
		const html = await res.text()
		if (html.includes(testEvent.name)) break
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})
```

## Assertions

**For async/SSE/polling updates**, use `expect().toPass()` which retries until the assertion passes or times out:

```ts
await expect(async () => {
	const count = await page.getByRole("button", { name: "Open" }).count()
	expect(count).toBeLessThan(previousCount)
}).toPass({ timeout: 20_000 })
```

**For navigation**: `await page.waitForURL("**/register", { timeout: 10_000 })`

**For element readiness**: `await expect(button).toBeEnabled({ timeout: 15_000 })`

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
- **Always use `test.describe.configure({ mode: "serial" })` when tests share `beforeAll` state** — `fullyParallel: true` will otherwise run each test in its own worker with its own `beforeAll`
- **Always clean up test events** — call `deleteTestEvent()` in `afterAll`
- **Always close custom browser contexts** — use a `try`/`finally` block
- **Always invalidate + warm the Next.js cache** after creating a test event (see Fixtures section)
- **Use `data-slot` attributes over `[class*=...]` selectors** — CSS class names are unreliable with Tailwind; prefer `[data-slot='card']` or role-based selectors
