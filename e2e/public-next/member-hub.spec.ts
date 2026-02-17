import { test, expect } from "@playwright/test"

test.describe("Member Hub", () => {
	test("hub page renders with navigation cards", async ({ page }) => {
		await page.goto("/member")

		const main = page.getByRole("main")
		await expect(main.getByRole("heading", { name: "Account" })).toBeVisible()
		await expect(main.getByRole("heading", { name: "Friends" })).toBeVisible()
		await expect(main.getByRole("heading", { name: "Scores" })).toBeVisible()
		await expect(main.getByRole("heading", { name: "Results" })).toBeVisible()
	})

	test("account card links to account page", async ({ page }) => {
		await page.goto("/member")

		await page
			.getByRole("main")
			.getByRole("link", { name: /account/i })
			.click()
		await expect(page).toHaveURL(/\/member\/account/)
	})

	test("friends card links to friends page", async ({ page }) => {
		await page.goto("/member")

		await page
			.getByRole("link", { name: /friends/i })
			.first()
			.click()
		await expect(page).toHaveURL(/\/member\/friends/)
	})

	test("scores card links to scores page", async ({ page }) => {
		await page.goto("/member")

		await page
			.getByRole("link", { name: /scores/i })
			.first()
			.click()
		await expect(page).toHaveURL(/\/member\/scores/)
	})

	test("results card links to results page", async ({ page }) => {
		await page.goto("/member")

		await page
			.getByRole("link", { name: /results/i })
			.first()
			.click()
		await expect(page).toHaveURL(/\/member\/results/)
	})
})
