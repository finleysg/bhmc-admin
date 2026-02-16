import { test, expect } from "@playwright/test"

test.describe("Guest Navigation", () => {
	test("sidebar shows Login and Create Account links", async ({ page }) => {
		await page.goto("/")

		const sidebar = page.getByRole("navigation")
		await expect(sidebar.getByRole("link", { name: "Login" })).toBeVisible()
		await expect(sidebar.getByRole("link", { name: "Create Account" })).toBeVisible()
	})

	test("sidebar hides member-only links", async ({ page }) => {
		await page.goto("/")

		await expect(page.getByRole("link", { name: "Directory" })).not.toBeVisible()
		await expect(page.getByRole("link", { name: "My Pages" })).not.toBeVisible()
	})

	test("member pages redirect to sign-in", async ({ page }) => {
		await page.goto("/member/directory")

		await page.waitForURL(/\/sign-in/)
	})
})
