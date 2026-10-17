import { test, expect } from "@playwright/test"

test.describe("Calendar Page", () => {
	test("redirects to current month", async ({ page }) => {
		const now = new Date()
		const month = now.toLocaleString("en-US", { month: "long" }).toLowerCase()
		await page.goto("/calendar")

		await expect(page).toHaveURL(new RegExp(`/calendar/${now.getFullYear()}/${month}$`))
	})

	test("calendar grid renders", async ({ page }) => {
		await page.goto("/calendar")

		await expect(page.getByRole("heading", { level: 2 })).toBeVisible()
		await expect(page.getByText("Sun", { exact: true }).first()).toBeVisible()
		await expect(page.getByText("Mon", { exact: true }).first()).toBeVisible()
		await expect(page.getByText("Tue", { exact: true }).first()).toBeVisible()
	})

	test("month navigation works", async ({ page }) => {
		await page.goto("/calendar/2026/february")

		await expect(page.getByRole("heading", { name: /February 2026/ })).toBeVisible()

		// Navigate to next month
		await page.getByRole("link", { name: "Next month" }).click()

		await expect(page).toHaveURL(/\/calendar\/2026\/march/)
		await expect(page.getByRole("heading", { name: /March 2026/ })).toBeVisible()
	})

	test("dropdowns navigate independently and stay in sync with history", async ({ page }) => {
		await page.goto("/calendar/2026/february")
		const month = page.getByRole("combobox", { name: "Calendar month" })
		const year = page.getByRole("combobox", { name: "Calendar year" })
		await expect(month).toHaveText("February")
		await expect(year).toHaveText("2026")
		await month.click()
		await page.getByRole("option", { name: "December", exact: true }).click()
		await expect(page).toHaveURL(/\/calendar\/2026\/december$/)
		await year.click()
		await page.getByRole("option", { name: "2025", exact: true }).click()
		await expect(page).toHaveURL(/\/calendar\/2025\/december$/)
		await page.getByRole("link", { name: "Next month" }).click()
		await expect(page).toHaveURL(/\/calendar\/2026\/january$/)
		await expect(month).toHaveText("January")
		await expect(year).toHaveText("2026")
		await page.goBack()
		await expect(month).toHaveText("December")
		await expect(year).toHaveText("2025")
	})
})
