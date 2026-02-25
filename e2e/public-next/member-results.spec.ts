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

		// Wait for either result cards or the no results message to appear
		await expect(async () => {
			const hasResults = await page.locator("[data-slot='card']").count()
			const hasNoResultsMessage = await page.getByText(/no results/i).isVisible()
			expect(hasResults > 0 || hasNoResultsMessage).toBeTruthy()
		}).toPass({ timeout: 10_000 })
	})
})
