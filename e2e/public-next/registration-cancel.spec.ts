import { test, expect } from "@playwright/test"
import { getTestEventUrl } from "../fixtures/test-events"

test.describe.serial("Registration Cancel Flow", () => {
	test("cancel at register step releases slots and redirects", async ({ page }) => {
		test.setTimeout(60000)
		const url = getTestEventUrl("weeknight_open")

		// Step 1: Reserve — select a tee time slot
		await page.goto(`${url}/reserve`)
		await expect(page.getByRole("heading", { name: /Select Starting Position/i })).toBeVisible({
			timeout: 10000,
		})

		const selectButton = page
			.getByRole("button", { name: "Select" })
			.and(page.locator(":not([disabled])"))
		await expect(selectButton.first()).toBeVisible({ timeout: 10000 })
		await selectButton.first().click()

		const registerButton = page
			.getByRole("button", { name: "Register" })
			.and(page.locator(":not([disabled])"))
		await expect(registerButton.first()).toBeEnabled()
		await registerButton.first().click()

		// Step 2: Register — wait for page to load
		await page.waitForURL(/\/register$/)
		await expect(page.getByText("Paul Christenson")).toBeVisible({ timeout: 15000 })

		// Click Cancel
		await page.getByRole("button", { name: "Cancel" }).click()

		// Confirm in dialog
		const confirmButton = page.getByRole("button", { name: /Cancel Registration/i })
		await expect(confirmButton).toBeVisible({ timeout: 5000 })
		await confirmButton.click()

		// Should redirect back to event page
		await expect(page.getByText("[E2E] Weeknight Open")).toBeVisible({ timeout: 10000 })

		// Verify slots are released — reserve page should show available slots
		await page.goto(`${url}/reserve`)
		await expect(page.getByRole("heading", { name: /Select Starting Position/i })).toBeVisible({
			timeout: 10000,
		})
		// At least one Select button should be available (slots were released)
		const availableSelect = page
			.getByRole("button", { name: "Select" })
			.and(page.locator(":not([disabled])"))
		await expect(availableSelect.first()).toBeVisible({ timeout: 10000 })
	})
})
