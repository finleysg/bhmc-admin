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
	// Use a date 7 days out to avoid conflicting with other specs
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 7)
	testEvent = await createTestEvent(token, undefined, startDate.toISOString().slice(0, 10))
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test("member 10 completes registration", async ({ page }) => {
	test.setTimeout(90_000)
	const member = getMember(10)!

	// GIVEN: Test event exists and member 10 is signed in
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// WHEN: Member 10 goes through the registration flow
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	const selectButton = page.getByRole("button", { name: "Select" }).first()
	await expect(selectButton).toBeEnabled({ timeout: 30_000 })

	await page.getByRole("button", { name: "Open" }).first().click()
	const registerButton = page.getByRole("button", { name: "Register" }).first()
	await expect(registerButton).toBeEnabled({ timeout: 5_000 })
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })

	// THEN: Registration completes (at least past the register page)
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })

	// Continue through to review to finalize the registration
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/review", { timeout: 10_000 })

	// Continue to payment page — registration is now AWAITING_PAYMENT with player in slot
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/payment", { timeout: 10_000 })
})

test("search excludes already-registered players", async ({ page }) => {
	test.setTimeout(90_000)
	const member10 = getMember(10)!
	const member11 = getMember(11)!

	// GIVEN: Member 10 is registered, member 11 signs in and starts registration
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member11.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	// Select ALL available slots in the group (gives member 11 empty slots for adding players)
	const selectButton = page.getByRole("button", { name: "Select" }).first()
	await expect(selectButton).toBeEnabled({ timeout: 30_000 })
	await selectButton.click()

	const registerButton = page.getByRole("button", { name: "Register" }).first()
	await expect(registerButton).toBeEnabled({ timeout: 5_000 })
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })

	// WHEN: Member 11 searches for member 10 (already registered) via the player picker
	const searchInput = page.getByRole("combobox")
	const searchResponsePromise = page.waitForResponse((resp) =>
		resp.url().includes("/api/players/search"),
	)
	await searchInput.fill(member10.last_name)
	const searchResponse = await searchResponsePromise
	expect(searchResponse.ok()).toBe(true)

	// THEN: Already-registered player is excluded from search results
	await expect(page.getByText("No players found.")).toBeVisible({ timeout: 10_000 })
	await expect(page.getByRole("option")).toHaveCount(0)
})
