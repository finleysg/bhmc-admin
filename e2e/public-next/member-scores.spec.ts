import { test, expect } from "@playwright/test"

test.describe("Member Scores", () => {
	test("scores page renders with filter controls", async ({ page }) => {
		await page.goto("/member/scores")

		await expect(page.getByText("My Scores")).toBeVisible()
		// Course and score type are <select> elements — check they exist
		const courseSelect = page.locator("select").first()
		await expect(courseSelect).toBeVisible()
		await expect(courseSelect).toHaveValue("")
		await expect(page.getByText("Export")).toBeVisible()
	})

	test("score type dropdown has options", async ({ page }) => {
		await page.goto("/member/scores")

		const scoreTypeSelect = page.locator("select").nth(1)
		await expect(scoreTypeSelect).toBeVisible()

		const options = scoreTypeSelect.locator("option")
		await expect(options).toHaveCount(3)
	})
})
