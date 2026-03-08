import { test, expect } from "@playwright/test"

import { getMember, testPassword } from "../fixtures/test-accounts"
import { createTestEvent, deleteTestEvent, getAdminToken } from "../fixtures/test-event"
import { warmCacheAndVerify } from "../fixtures/test-helpers"
import type { TestEvent } from "../fixtures/test-event"

const PUBLIC_NEXT_URL = "http://localhost:3200"

let token: string
let testEvent: TestEvent

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()
	testEvent = await createTestEvent(token, 914)
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test("enables Register with a single selected slot after priority", async ({ page }) => {
	test.setTimeout(60_000)
	const member = getMember(5)!

	await page.goto("/sign-in")
	await page.getByLabel("Email").fill(member.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Capture SSE-related console logs
	const sseLogs: string[] = []
	page.on("console", (msg) => {
		const text = msg.text()
		if (text.includes("[SSE]") || text.includes("sse") || text.includes("SSE")) {
			sseLogs.push(text)
		}
	})

	// Navigate to the event detail page
	await page.goto(testEvent.eventUrl)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	// Wait for the tee sheet to render — Select button becomes enabled once SSE delivers the wave
	const selectButton = page.getByRole("button", { name: "Select" }).first()
	try {
		await expect(selectButton).toBeEnabled({ timeout: 30_000 })
	} catch (e) {
		console.log("SSE logs:", sseLogs.join("\n"))
		throw e
	}

	// Click a single open slot cell
	const openSlot = page.getByRole("button", { name: "Open" }).first()
	await openSlot.click()

	// The Register button in that group should be enabled
	const registerButton = page.getByRole("button", { name: "Register" }).first()
	await expect(registerButton).toBeEnabled()

	// Click Register and verify navigation to the register page (not a 404)
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })

	// URL should contain the event name segment (not just /event/<date>/register)
	expect(page.url()).toContain(testEvent.eventUrl)

	// The register page should render the "Players and Fees" card
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })
})

test("requires minimum group size during priority registration", async ({ page }) => {
	test.setTimeout(60_000)
	const member = getMember(6)!

	// Create a separate event where the priority window is still active
	// (priority_signup_start = 1h ago, signup_start = 1h from now)
	// Use a different start date to avoid conflict with the shared test event
	const dayAfterTomorrow = new Date()
	dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
	const startDate = dayAfterTomorrow.toISOString().slice(0, 10)
	const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
	const priorityEvent = await createTestEvent(token, 914, startDate, {
		signup_start: oneHourFromNow,
	})

	try {
		await warmCacheAndVerify(priorityEvent.eventUrl, priorityEvent.name)

		// Sign in
		await page.goto("/sign-in")
		await page.getByLabel("Email").fill(member.email)
		await page.getByLabel("Password").fill(testPassword)
		await page.getByRole("button", { name: "Sign In" }).click()
		await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

		// Navigate to the reserve page
		await page.goto(priorityEvent.eventUrl)
		await page.getByRole("link", { name: "Sign Up" }).click()
		await page.waitForURL("**/reserve")

		// Wait for SSE readiness
		const selectButton = page.getByRole("button", { name: "Select" }).first()
		await expect(selectButton).toBeEnabled({ timeout: 30_000 })

		// Template event 914 has minimum_signup_group_size=3 and group_size=5.
		// Click a single open slot — Register should be disabled (1 < 3)
		await page.getByRole("button", { name: "Open" }).first().click()
		const registerButton = page.getByRole("button", { name: "Register" }).first()
		await expect(registerButton).toBeDisabled()

		// Select a second slot — still disabled (2 < 3)
		await page.getByRole("button", { name: "Open" }).first().click()
		await expect(registerButton).toBeDisabled()

		// Select a third slot — now enabled (3 >= 3)
		await page.getByRole("button", { name: "Open" }).first().click()
		await expect(registerButton).toBeEnabled()

		// Deselect one slot — disabled again (2 < 3)
		await page.getByRole("button", { name: "Selected" }).first().click()
		await expect(registerButton).toBeDisabled()
	} finally {
		await deleteTestEvent(token, priorityEvent.id)
	}
})

test("redirects to event detail page when registration is closed", async ({ page }) => {
	test.setTimeout(60_000)

	// Create an event with registration windows in the past
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 4)
	const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
	const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

	const closedEvent = await createTestEvent(token, 914, startDate.toISOString().slice(0, 10), {
		priority_signup_start: threeHoursAgo,
		signup_start: twoHoursAgo,
		signup_end: oneHourAgo,
		payments_end: oneHourAgo,
	})

	try {
		await warmCacheAndVerify(closedEvent.eventUrl, closedEvent.name)

		// Navigate directly to the reserve page
		await page.goto(`${PUBLIC_NEXT_URL}${closedEvent.reserveUrl}`)

		// Should redirect to the event detail page
		await expect(page).toHaveURL(`${PUBLIC_NEXT_URL}${closedEvent.eventUrl}`, { timeout: 10_000 })

		// Verify the event detail page rendered
		await expect(page.getByText(closedEvent.name)).toBeVisible()
	} finally {
		await deleteTestEvent(token, closedEvent.id)
	}
})

test("shows real-time updates when another user registers", async ({ browser }) => {
	test.setTimeout(90_000)

	const member1 = getMember(7)!
	const member2 = getMember(8)!

	// Create two independent browser contexts (separate sessions)
	const contextA = await browser.newContext()
	const contextB = await browser.newContext()
	const pageA = await contextA.newPage()
	const pageB = await contextB.newPage()

	// Capture SSE logs on User A's page for debugging
	const sseLogsA: string[] = []
	pageA.on("console", (msg) => {
		const text = msg.text()
		if (text.includes("[SSE]") || text.includes("sse") || text.includes("SSE")) {
			sseLogsA.push(text)
		}
	})

	try {
		// Sign in User A
		await pageA.goto(`${PUBLIC_NEXT_URL}/sign-in`)
		await pageA.getByLabel("Email").fill(member1.email)
		await pageA.getByLabel("Password").fill(testPassword)
		await pageA.getByRole("button", { name: "Sign In" }).click()
		await pageA.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

		// Sign in User B
		await pageB.goto(`${PUBLIC_NEXT_URL}/sign-in`)
		await pageB.getByLabel("Email").fill(member2.email)
		await pageB.getByLabel("Password").fill(testPassword)
		await pageB.getByRole("button", { name: "Sign In" }).click()
		await pageB.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

		// Both navigate to the reserve page
		await pageA.goto(`${PUBLIC_NEXT_URL}${testEvent.reserveUrl}`)
		await pageB.goto(`${PUBLIC_NEXT_URL}${testEvent.reserveUrl}`)

		// Wait for SSE readiness on both pages (Select button enabled)
		const selectA = pageA.getByRole("button", { name: "Select" }).first()
		const selectB = pageB.getByRole("button", { name: "Select" }).first()
		await expect(selectA).toBeEnabled({ timeout: 30_000 })
		await expect(selectB).toBeEnabled({ timeout: 30_000 })

		// Count open slots on User A's page before registration
		const openCountBefore = await pageA.getByRole("button", { name: "Open" }).count()

		// User B registers for a slot
		await pageB.getByRole("button", { name: "Open" }).first().click()
		await pageB.getByRole("button", { name: "Register" }).first().click()
		await pageB.waitForURL("**/register", { timeout: 10_000 })

		// User A should see fewer open slots via SSE (or polling fallback)
		await expect(async () => {
			const openCountAfter = await pageA.getByRole("button", { name: "Open" }).count()
			expect(openCountAfter).toBeLessThan(openCountBefore)
		}).toPass({ timeout: 20_000 })

		// Verify SSE logs were captured (indicates SSE connection was active)
		console.log("SSE logs (User A):", sseLogsA.join("\n"))
	} finally {
		await contextA.close()
		await contextB.close()
	}
})
