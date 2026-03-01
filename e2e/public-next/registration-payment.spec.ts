import { test, expect } from "@playwright/test"

import { getMember, testPassword } from "../fixtures/test-accounts"
import { createTestEvent, deleteTestEvent, getAdminToken } from "../fixtures/test-event"
import { warmCacheAndVerify } from "../fixtures/test-helpers"
import type { TestEvent } from "../fixtures/test-event"

const PUBLIC_NEXT_URL = "http://localhost:3200"
const MAILPIT_API = "http://localhost:8025/api/v1"

let token: string
let testEvent: TestEvent

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()
	// Use a date 5 days out to avoid conflicting with other specs
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 5)
	testEvent = await createTestEvent(token, 914, startDate.toISOString().slice(0, 10))
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test("full payment flow completes without beforeunload dialog", async ({ page }) => {
	test.setTimeout(120_000)
	const member = getMember(9)!

	// Track if any dialog fires (beforeunload shows as a dialog in Playwright)
	let dialogFired = false
	page.on("dialog", async (dialog) => {
		dialogFired = true
		await dialog.accept()
	})

	// Sign in
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to event detail → Sign Up → /reserve
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	// Wait for SSE readiness
	const selectButton = page.getByRole("button", { name: "Select" }).first()
	await expect(selectButton).toBeEnabled({ timeout: 30_000 })

	// Select 1 slot and register
	await page.getByRole("button", { name: "Open" }).first().click()
	const registerButton = page.getByRole("button", { name: "Register" }).first()
	await expect(registerButton).toBeEnabled({ timeout: 5_000 })
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })

	// Verify Players and Fees page
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })

	// Click Continue → /review
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/review", { timeout: 10_000 })

	// Click Continue → /payment
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/payment", { timeout: 10_000 })

	// Fill Stripe PaymentElement iframe with test card
	const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first()
	await stripeFrame.getByPlaceholder("1234 1234 1234 1234").fill("4242 4242 4242 4242")
	await stripeFrame.getByPlaceholder("MM / YY").fill("12 / 30")
	await stripeFrame.getByPlaceholder("CVC").fill("123")
	await stripeFrame.getByPlaceholder("12345").fill("55304")

	// Click Submit Payment
	await page.getByRole("button", { name: "Submit Payment" }).click()

	// Wait for redirect to /complete page
	await page.waitForURL("**/complete**", { timeout: 30_000 })

	// Assert no beforeunload dialog fired during the redirect
	expect(dialogFired).toBe(false)

	// Verify Payment Complete text visible
	await expect(page.getByText("Payment Complete")).toBeVisible({ timeout: 15_000 })

	// Poll Mailpit for confirmation email
	const memberEmail = member.email
	await expect(async () => {
		const res = await fetch(
			`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${memberEmail}`)}`,
		)
		const data = (await res.json()) as { messages_count: number }
		expect(data.messages_count).toBeGreaterThan(0)
	}).toPass({ timeout: 30_000, intervals: [2_000, 3_000, 5_000] })
})
