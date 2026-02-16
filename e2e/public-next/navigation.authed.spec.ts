import { test, expect } from "@playwright/test"

test.describe("Authenticated Navigation", () => {
	test("sidebar shows member links", async ({ page }) => {
		await page.goto("/")

		await expect(page.getByRole("link", { name: "Directory" })).toBeVisible()
		await expect(page.getByRole("link", { name: "My Pages" })).toBeVisible()
	})

	test("sidebar hides guest links", async ({ page }) => {
		await page.goto("/")

		const sidebar = page.getByRole("navigation")
		await expect(sidebar.getByRole("link", { name: "Login" })).not.toBeVisible()
		await expect(sidebar.getByRole("link", { name: "Create Account" })).not.toBeVisible()
	})

	test("user menu is visible", async ({ page }) => {
		await page.goto("/")

		await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible()
	})

	test("logout works", async ({ page }) => {
		await page.goto("/")

		await page.getByRole("button", { name: "Account menu" }).click()
		await page.getByRole("menuitem", { name: "Logout" }).click()

		const sidebar = page.getByRole("navigation")
		await expect(sidebar.getByRole("link", { name: "Login" })).toBeVisible()
	})
})
