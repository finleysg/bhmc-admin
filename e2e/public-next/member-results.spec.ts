import { test, expect } from "@playwright/test"

test.describe("Member Results", () => {
	test("results page renders with season selector", async ({ page }) => {
		await page.goto("/member/results")

		await expect(page.getByText("My Results")).toBeVisible()
		// Season select should be visible
		const seasonSelect = page.locator("select")
		await expect(seasonSelect).toBeVisible()
	})

	test("results page shows content or no results message", async ({ page }) => {
		await page.goto("/member/results")

		// Wait for loading to finish
		await page.waitForTimeout(2000)

		// Either we see result cards or the no results message
		const hasResults = await page.locator("[class*=card]").count()
		const hasNoResultsMessage = await page.getByText(/no results/i).isVisible()

		expect(hasResults > 0 || hasNoResultsMessage).toBeTruthy()
	})
})
