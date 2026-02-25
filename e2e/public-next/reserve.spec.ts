import { test, expect } from "@playwright/test"

import { testUser } from "../fixtures/test-accounts"
import { createTestEvent, deleteTestEvent, getAdminToken } from "../fixtures/test-event"
import type { TestEvent } from "../fixtures/test-event"

const PUBLIC_NEXT_URL = "http://localhost:3200"

let token: string
let testEvent: TestEvent

test.beforeAll(async () => {
	token = await getAdminToken()
	testEvent = await createTestEvent(token, 914)

	// Invalidate Next.js data cache so the newly created event is found
	await fetch(`${PUBLIC_NEXT_URL}/api/revalidate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tag: "events" }),
	})

	// Warm the cache and verify the event is present in the response
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

test("enables Register with a single selected slot after priority", async ({ page }) => {
	test.setTimeout(60_000)

	// Sign in directly so this test is not affected by other tests invalidating the shared token
	await page.goto("/sign-in")
	await page.getByLabel("Email").fill(testUser.email)
	await page.getByLabel("Password").fill(testUser.password)
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
		await expect(selectButton).toBeEnabled({ timeout: 15_000 })
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
