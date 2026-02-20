import { test, expect } from "@playwright/test"

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
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test.skip("enables Register with a single selected slot after priority", async ({ page }) => {
	// Capture SSE-related console logs
	const sseLogs: string[] = []
	page.on("console", (msg) => {
		const text = msg.text()
		if (text.includes("[SSE]") || text.includes("sse") || text.includes("SSE")) {
			sseLogs.push(text)
		}
	})

	// Start at the event detail page and click Sign Up to reach the reserve page
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
})
