import { test, expect } from "@playwright/test"

test.describe("Member Scores", () => {
	test("scores page renders with filter controls", async ({ page }) => {
		await page.goto("/member/scores")

		await expect(page.getByText("My Scores")).toBeVisible()
		const courseSelect = page.getByRole("combobox", { name: "Course filter" })
		await expect(courseSelect).toBeVisible()
		await expect(courseSelect).toHaveValue("")
		await expect(page.getByText("Export")).toBeVisible()
	})

	test("score type dropdown has options", async ({ page }) => {
		await page.goto("/member/scores")

		const scoreTypeSelect = page.getByRole("combobox", { name: "Score type filter" })
		await expect(scoreTypeSelect).toBeVisible()

		const options = scoreTypeSelect.locator("option")
		await expect(options).toHaveCount(3)
	})
})
