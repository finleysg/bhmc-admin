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
	// Use a date 3 days out to avoid conflicting with reserve.spec.ts (which uses tomorrow)
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 3)
	testEvent = await createTestEvent(token, 914, startDate.toISOString().slice(0, 10))
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

async function signInAndStartRegistration(
	page: import("@playwright/test").Page,
	email: string,
	password: string,
) {
	// Sign in
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password").fill(password)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to reserve page
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	// Wait for SSE readiness
	const selectButton = page.getByRole("button", { name: "Select" }).first()
	await expect(selectButton).toBeEnabled({ timeout: 30_000 })

	// Select a slot and register
	await page.getByRole("button", { name: "Open" }).first().click()
	const registerButton = page.getByRole("button", { name: "Register" }).first()
	await expect(registerButton).toBeEnabled({ timeout: 30_000 })
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })
}

test("shows guard dialog when clicking nav link, confirm navigates away", async ({ page }) => {
	test.setTimeout(90_000)
	const member = getMember(1)!

	await signInAndStartRegistration(page, member.email, testPassword)

	// Click the logo link in the header (scoped to avoid matching sidebar/footer Home links)
	await page.locator("header").getByRole("link", { name: "Home" }).click()

	// Dialog should appear
	await expect(page.getByText("Leave Registration?")).toBeVisible({ timeout: 5_000 })
	await expect(page.getByText("You have an in-progress registration")).toBeVisible()

	// Click Leave to confirm
	await page.getByRole("button", { name: "Leave" }).click()

	// Should navigate away from the register page
	await expect(page).not.toHaveURL(/\/register/, { timeout: 10_000 })
})

test("shows guard dialog when clicking nav link, cancel stays on page", async ({ page }) => {
	test.setTimeout(90_000)
	const member = getMember(2)!

	await signInAndStartRegistration(page, member.email, testPassword)

	// Click the logo link in the header
	await page.locator("header").getByRole("link", { name: "Home" }).click()

	// Dialog should appear
	await expect(page.getByText("Leave Registration?")).toBeVisible({ timeout: 5_000 })

	// Click Stay to cancel
	await page.getByRole("button", { name: "Stay" }).click()

	// Should still be on the register page
	expect(page.url()).toContain("/register")
	await expect(page.getByText("Players and Fees")).toBeVisible()
})

test("shows guard dialog when pressing back button, confirm navigates away", async ({ page }) => {
	test.setTimeout(90_000)
	const member = getMember(3)!

	await signInAndStartRegistration(page, member.email, testPassword)

	// Simulate browser back via client-side history.back() to trigger popstate
	await page.evaluate(() => window.history.back())

	// Dialog should appear
	await expect(page.getByText("Leave Registration?")).toBeVisible({ timeout: 5_000 })
	await expect(page.getByText("You have an in-progress registration")).toBeVisible()

	// Click Leave to confirm
	page.on("dialog", (dialog) => dialog.accept())
	await page.getByRole("button", { name: "Leave" }).click()

	// Should navigate away from the register page
	await expect(page).not.toHaveURL(/\/register/, { timeout: 10_000 })
})

test("shows guard dialog when pressing back button, cancel stays on page", async ({ page }) => {
	test.setTimeout(90_000)
	const member = getMember(4)!

	await signInAndStartRegistration(page, member.email, testPassword)

	// Simulate browser back via client-side history.back() to trigger popstate
	await page.evaluate(() => window.history.back())

	// Dialog should appear
	await expect(page.getByText("Leave Registration?")).toBeVisible({ timeout: 5_000 })

	// Click Stay to cancel
	await page.getByRole("button", { name: "Stay" }).click()

	// Should still be on the register page
	expect(page.url()).toContain("/register")
	await expect(page.getByText("Players and Fees")).toBeVisible()
})
