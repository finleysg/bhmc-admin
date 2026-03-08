import { test, expect } from "@playwright/test"

test.describe("Member Friends", () => {
	test("friends page renders", async ({ page }) => {
		await page.goto("/member/friends")

		await expect(page.getByText("My Friends")).toBeVisible()
	})

	test("add friend button reveals search input", async ({ page }) => {
		await page.goto("/member/friends")

		await page.getByText("Add Friend").click()
		await expect(page.getByPlaceholder(/search for player/i)).toBeVisible()
	})

	test("close button hides search", async ({ page }) => {
		await page.goto("/member/friends")

		await page.getByText("Add Friend").click()
		await expect(page.getByPlaceholder(/search for player/i)).toBeVisible()

		await page.getByRole("button", { name: /close search/i }).click()
		await expect(page.getByPlaceholder(/search for player/i)).not.toBeVisible()
	})
})
