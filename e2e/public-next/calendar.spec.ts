import { test, expect } from "@playwright/test"

test.describe("Calendar Page", () => {
	test("redirects to current month", async ({ page }) => {
		await page.goto("/calendar")

		await expect(page).toHaveURL(/\/calendar\/\d{4}\/[a-z]+/)
	})

	test("calendar grid renders", async ({ page }) => {
		await page.goto("/calendar")

		await expect(page.getByRole("heading", { level: 2 })).toBeVisible()
		await expect(page.getByText("Sun", { exact: true })).toBeVisible()
		await expect(page.getByText("Mon", { exact: true })).toBeVisible()
		await expect(page.getByText("Tue", { exact: true })).toBeVisible()
	})

	test("month navigation works", async ({ page }) => {
		await page.goto("/calendar/2026/february")

		await expect(page.getByRole("heading", { name: /February 2026/ })).toBeVisible()

		// Navigate to next month
		await page.getByRole("link", { name: "Next month" }).click()

		await expect(page).toHaveURL(/\/calendar\/2026\/march/)
		await expect(page.getByRole("heading", { name: /March 2026/ })).toBeVisible()
	})
})
