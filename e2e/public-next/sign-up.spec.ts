import { test, expect } from "@playwright/test"

test.describe("Sign Up Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/sign-up")
	})

	test("renders sign up form", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible()
		await expect(page.getByLabel("First Name")).toBeVisible()
		await expect(page.getByLabel("Last Name")).toBeVisible()
		await expect(page.getByLabel("Email")).toBeVisible()
		await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
		await expect(page.getByLabel("Confirm Password")).toBeVisible()
		await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible()
	})

	test("shows validation errors for mismatched passwords", async ({ page }) => {
		await page.getByLabel("First Name").fill("Test")
		await page.getByLabel("Last Name").fill("User")
		await page.getByLabel("Email").fill("test@example.com")
		await page.getByLabel("Password", { exact: true }).fill("password123")
		await page.getByLabel("Confirm Password").fill("different123")
		await page.getByRole("button", { name: "Create Account" }).click()

		await expect(page.getByText(/passwords do not match/i)).toBeVisible()
	})

	test("has link to sign in", async ({ page }) => {
		const signInLink = page.getByRole("link", { name: "Sign in" })
		await expect(signInLink).toBeVisible()
		await expect(signInLink).toHaveAttribute("href", "/sign-in")
	})
})
