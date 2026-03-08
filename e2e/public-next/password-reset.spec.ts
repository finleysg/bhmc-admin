import { test, expect } from "@playwright/test"

test.describe("Password Reset", () => {
	test("renders reset password form", async ({ page }) => {
		await page.goto("/reset-password")

		await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible()
		await expect(page.getByLabel("Email")).toBeVisible()
		await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible()
	})

	test("submitting redirects to sent page", async ({ page }) => {
		await page.goto("/reset-password")
		await page.getByLabel("Email").fill("test@example.com")
		await page.getByRole("button", { name: "Send Reset Link" }).click()

		await page.waitForURL(/\/reset-password\/sent/)
		await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible()
	})

	test("has link back to sign in", async ({ page }) => {
		await page.goto("/reset-password")

		const backLink = page.getByRole("link", { name: "Back to sign in" })
		await expect(backLink).toBeVisible()
		await expect(backLink).toHaveAttribute("href", "/sign-in")
	})

	test("complete page renders", async ({ page }) => {
		await page.goto("/reset-password/complete")

		await expect(page.getByRole("heading", { name: "Password Reset Complete" })).toBeVisible()
		await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible()
	})
})
