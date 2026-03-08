import { test, expect } from "@playwright/test"
import { testUser } from "../fixtures/test-accounts"

test.describe("Sign In Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/sign-in")
	})

	test("renders sign in form", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible()
		await expect(page.getByLabel("Email")).toBeVisible()
		await expect(page.getByLabel("Password")).toBeVisible()
		await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
	})

	test("shows error for invalid credentials", async ({ page }) => {
		await page.getByLabel("Email").fill("bad@example.com")
		await page.getByLabel("Password").fill("wrongpassword")
		await page.getByRole("button", { name: "Sign In" }).click()

		await expect(page.getByText(/login failed|invalid|unable/i)).toBeVisible()
	})

	test("successful login redirects to home", async ({ page }) => {
		await page.getByLabel("Email").fill(testUser.email)
		await page.getByLabel("Password").fill(testUser.password)
		await page.getByRole("button", { name: "Sign In" }).click()

		await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible({
			timeout: 15000,
		})
	})

	test("has link to password reset", async ({ page }) => {
		const resetLink = page.getByRole("link", { name: "Forgot your password?" })
		await expect(resetLink).toBeVisible()
		await expect(resetLink).toHaveAttribute("href", "/reset-password")
	})

	test("has link to sign up", async ({ page }) => {
		const signUpLink = page.getByRole("link", { name: "Sign up" })
		await expect(signUpLink).toBeVisible()
		await expect(signUpLink).toHaveAttribute("href", "/sign-up")
	})
})
