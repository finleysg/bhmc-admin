import { test, expect } from "@playwright/test"
import { getTestEventUrl } from "../fixtures/test-events"

test.describe.serial("Weeknight Registration", () => {
	test("event detail shows Sign Up button", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")
		await page.goto(url)

		await expect(page.getByText("[E2E] Weeknight Open")).toBeVisible({ timeout: 10000 })
		const signUpLink = page.getByRole("link", { name: "Sign Up" })
		await expect(signUpLink).toBeVisible()
		await expect(signUpLink).toBeEnabled()
	})

	test("full registration with Stripe payment", async ({ page }) => {
		test.setTimeout(90000)
		const url = getTestEventUrl("weeknight_open")

		// Step 1: Reserve — select a tee time slot
		await page.goto(`${url}/reserve`)
		await expect(page.getByRole("heading", { name: /Select Starting Position/i })).toBeVisible({
			timeout: 10000,
		})

		// Click the first enabled "Select" button (skip disabled starter-time rows)
		const selectButton = page
			.getByRole("button", { name: "Select" })
			.and(page.locator(":not([disabled])"))
		await expect(selectButton.first()).toBeVisible({ timeout: 10000 })
		await selectButton.first().click()

		// Click the now-enabled "Register" button in the same row
		const registerButton = page
			.getByRole("button", { name: "Register" })
			.and(page.locator(":not([disabled])"))
		await expect(registerButton.first()).toBeEnabled()
		await registerButton.first().click()

		// Step 2: Register — should navigate to register page
		await page.waitForURL(/\/register$/)

		// Wait for registration to load (player name appears once loading completes)
		await expect(page.getByText("Paul Christenson")).toBeVisible({ timeout: 15000 })

		// Check Gross Skins optional fee (use first() since weeknight events show multiple slots)
		const grossSkinsCheckbox = page.getByRole("checkbox", { name: /Gross Skins/i }).first()
		await grossSkinsCheckbox.check()

		// Click Continue to go to review
		await page.getByRole("button", { name: "Continue" }).click()

		// Step 3: Review
		await expect(page.getByText("Paul Christenson")).toBeVisible()
		await expect(page.getByText(/Gross Skins/i).first()).toBeVisible()

		// Click Continue to proceed to payment
		await page.getByRole("button", { name: "Continue" }).click()

		// Step 4: Payment — Stripe iframe
		await page.waitForURL(/\/payment$/)

		// Wait for Stripe iframe to load
		const stripeFrame = page.frameLocator('iframe[title="Secure payment input frame"]').first()
		await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 })

		// Fill Stripe card details
		await stripeFrame.locator('[name="number"]').fill("4242424242424242")
		await stripeFrame.locator('[name="expiry"]').fill("12/30")
		await stripeFrame.locator('[name="cvc"]').fill("123")

		// Fill ZIP if visible
		const zipField = stripeFrame.locator('[name="postalCode"]')
		if (await zipField.isVisible({ timeout: 2000 }).catch(() => false)) {
			await zipField.fill("55304")
		}

		// Submit payment
		await page.getByRole("button", { name: "Submit Payment" }).click()

		// Step 5: Complete — wait for payment processing
		await expect(page.getByText(/Payment Complete/i)).toBeVisible({ timeout: 30000 })
	})

	test("registered player appears in grid", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")
		await page.goto(`${url}/registrations`)

		// Can-choose events show a reserve grid with player slot badges
		await expect(page.getByText(/Registered Players/i)).toBeVisible({ timeout: 10000 })
		// At least one slot badge should be visible (reserved status shows as a badge)
		await expect(page.getByRole("button").first()).toBeVisible()
	})

	test("manage registration: add notes", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")
		await page.goto(`${url}/manage`)

		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })

		// Click "Add Notes"
		await page.getByRole("button", { name: "Add Notes" }).click()

		await expect(page.getByText("Notes / Player Requests")).toBeVisible({ timeout: 10000 })

		// Fill in notes
		const notesField = page.locator("#notes")
		await notesField.fill("E2E test notes for weeknight event")

		// Save
		await page.getByRole("button", { name: "Save" }).click()

		// Navigate back to manage to verify (save should succeed)
		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })
	})

	test("drop player from registration", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")
		await page.goto(`${url}/manage`)

		await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 10000 })

		// Click "Drop Players"
		await page.getByRole("button", { name: "Drop Players" }).click()

		await expect(page.getByText("Select players to drop")).toBeVisible({ timeout: 10000 })

		// Select player checkbox
		const playerCheckbox = page.getByRole("checkbox").first()
		await playerCheckbox.check()

		// Click Drop button
		await page.getByRole("button", { name: "Drop" }).click()

		// Confirm in dialog
		await page.getByRole("button", { name: "Confirm Drop" }).click()

		// Should redirect back to event page
		await expect(page.getByText("[E2E] Weeknight Open")).toBeVisible({ timeout: 10000 })
	})

	test("closed event hides Sign Up", async ({ page }) => {
		const url = getTestEventUrl("weeknight_closed")
		await page.goto(url)

		await expect(page.getByText("[E2E] Weeknight Closed")).toBeVisible({ timeout: 10000 })

		// Sign Up button should not be present
		await expect(page.getByRole("link", { name: "Sign Up" })).not.toBeVisible()
	})
})
