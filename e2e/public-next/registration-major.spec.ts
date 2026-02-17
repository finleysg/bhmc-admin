import { test, expect } from "@playwright/test"
import { getTestEventUrl } from "../fixtures/test-events"

test.describe.serial("Major Team Registration", () => {
	test("complete non-choosable team registration", async ({ page }) => {
		test.setTimeout(90000)
		const url = getTestEventUrl("major_open")

		// Non-choosable events skip reserve and go directly to register
		await page.goto(`${url}/register`)

		// Verify player name appears
		await expect(page.getByText("Paul Christenson")).toBeVisible({ timeout: 15000 })

		// Check Gross Skins optional fee (use first() since team events show multiple slots)
		const grossSkinsCheckbox = page.getByRole("checkbox", { name: /Gross Skins/i }).first()
		await grossSkinsCheckbox.check()

		// Click Continue to review
		await page.getByRole("button", { name: "Continue" }).click()

		// Review step
		await expect(page.getByText("Paul Christenson")).toBeVisible()
		await expect(page.getByText(/Gross Skins/i).first()).toBeVisible()

		// Continue to payment
		await page.getByRole("button", { name: "Continue" }).click()

		// Payment — Stripe iframe
		await page.waitForURL(/\/payment$/)

		const stripeFrame = page.frameLocator('iframe[title="Secure payment input frame"]').first()
		await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 })

		await stripeFrame.locator('[name="number"]').fill("4242424242424242")
		await stripeFrame.locator('[name="expiry"]').fill("12/30")
		await stripeFrame.locator('[name="cvc"]').fill("123")

		const zipField = stripeFrame.locator('[name="postalCode"]')
		if (await zipField.isVisible({ timeout: 2000 }).catch(() => false)) {
			await zipField.fill("55304")
		}

		await page.getByRole("button", { name: "Submit Payment" }).click()

		// Wait for complete page
		await expect(page.getByText(/Payment Complete/i)).toBeVisible({ timeout: 30000 })
	})

	test("manage: add notes", async ({ page }) => {
		const url = getTestEventUrl("major_open")
		await page.goto(`${url}/manage`)

		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })

		await page.getByRole("button", { name: "Add Notes" }).click()
		await expect(page.getByText("Notes / Player Requests")).toBeVisible({ timeout: 10000 })

		const notesField = page.locator("#notes")
		await notesField.fill("E2E test notes for major team event")

		await page.getByRole("button", { name: "Save" }).click()

		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })
	})

	test("drop from registration", async ({ page }) => {
		const url = getTestEventUrl("major_open")
		await page.goto(`${url}/manage`)

		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })

		await page.getByRole("button", { name: "Drop Players" }).click()
		await expect(page.getByText("Select players to drop")).toBeVisible({ timeout: 10000 })

		const playerCheckbox = page.getByRole("checkbox").first()
		await playerCheckbox.check()

		await page.getByRole("button", { name: "Drop" }).click()
		await page.getByRole("button", { name: "Confirm Drop" }).click()

		// Should redirect back to event page
		await expect(page.getByText("[E2E] Major Team Open")).toBeVisible({ timeout: 10000 })
	})
})
