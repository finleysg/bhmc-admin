import { test, expect } from "@playwright/test"

test.describe("Home Page", () => {
	test("renders main content sections", async ({ page }) => {
		await page.goto("/")

		await expect(page.getByText("Club News and Announcements")).toBeVisible()
		await expect(page.getByText("Upcoming Events", { exact: true })).toBeVisible()
		await expect(page.getByText("Quick Links")).toBeVisible()
	})
})
