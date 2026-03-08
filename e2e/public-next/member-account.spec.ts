import { test, expect } from "@playwright/test"

test.describe("Member Account", () => {
	test("account page renders player info in view mode", async ({ page }) => {
		await page.goto("/member/account")

		await expect(page.getByText("My Account")).toBeVisible()
		await page.getByText("Player Profile").waitFor()
		await expect(page.getByText("Player Profile")).toBeVisible()
		await expect(page.getByText("Password", { exact: true })).toBeVisible()
	})

	test("edit button switches to form mode", async ({ page }) => {
		await page.goto("/member/account")

		await page.getByText("Player Profile").waitFor()
		const editButton = page.getByRole("button", { name: /edit/i }).first()
		await editButton.click()

		await expect(page.getByRole("button", { name: /save/i })).toBeVisible()
		await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible()
	})

	test("cancel returns to view mode", async ({ page }) => {
		await page.goto("/member/account")

		await page.getByText("Player Profile").waitFor()
		const editButton = page.getByRole("button", { name: /edit/i }).first()
		await editButton.click()
		await page.getByRole("button", { name: /cancel/i }).click()

		await expect(page.getByRole("button", { name: /edit/i }).first()).toBeVisible()
	})

	test("password section renders with change button", async ({ page }) => {
		await page.goto("/member/account")

		await page.getByText("Password", { exact: true }).waitFor()
		await expect(page.getByText("Password", { exact: true })).toBeVisible()
		await expect(page.getByRole("button", { name: /change/i })).toBeVisible()
	})
})
