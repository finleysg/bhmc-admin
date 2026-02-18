import { test, expect } from "@playwright/test"
import { getTestEventUrl } from "../fixtures/test-events"

test.describe("Registration Guest Redirect", () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test("unauthenticated user is redirected to sign-in from reserve page", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")

		await page.goto(`${url}/reserve`)

		// Should be redirected to sign-in page
		await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 })
	})

	test("unauthenticated user is redirected to sign-in from register page", async ({ page }) => {
		const url = getTestEventUrl("weeknight_open")

		await page.goto(`${url}/register`)

		// Should be redirected to sign-in page
		await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 })
	})
})
