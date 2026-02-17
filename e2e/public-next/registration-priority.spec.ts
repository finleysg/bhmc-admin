import { test, expect } from "@playwright/test"
import { getTestEventUrl } from "../fixtures/test-events"

test.describe("Priority Registration", () => {
	test("wave restrictions during priority window", async ({ page }) => {
		const url = getTestEventUrl("weeknight_priority")
		await page.goto(`${url}/reserve`)

		await expect(page.getByRole("heading", { name: /Select Starting Position/i })).toBeVisible({
			timeout: 10000,
		})

		// During priority window, some groups should be wave-locked
		// Find enabled Select buttons (wave 1 groups that are available)
		const enabledSelects = page
			.getByRole("button", { name: "Select" })
			.and(page.locator(":not([disabled])"))

		// There should be at least one enabled Select for wave-1 groups
		await expect(enabledSelects.first()).toBeVisible({ timeout: 10000 })

		// Select an available wave-1 group
		await enabledSelects.first().click()

		// Click Register
		const registerButton = page
			.getByRole("button", { name: "Register" })
			.and(page.locator(":not([disabled])"))
		await expect(registerButton.first()).toBeEnabled()
		await registerButton.first().click()

		// Should navigate to register page
		await page.waitForURL(/\/register$/)

		// Wait for registration to load
		await expect(page.getByText("Paul Christenson")).toBeVisible({ timeout: 15000 })

		// In priority window with min group size of 3 but only 1 player,
		// clicking Continue should trigger the priority dialog
		await page.getByRole("button", { name: "Continue" }).click()

		// Priority dialog should appear
		await expect(page.getByRole("heading", { name: "Priority Registration" })).toBeVisible({
			timeout: 5000,
		})

		// Cancel registration via the dialog
		await page.getByRole("button", { name: "Cancel Registration" }).click()

		// Should navigate back to event page
		await expect(page.getByText("[E2E] Weeknight Priority")).toBeVisible({ timeout: 10000 })
	})
})
