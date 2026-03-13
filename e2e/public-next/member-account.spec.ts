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

	test("saving player info succeeds", async ({ page }) => {
		await page.goto("/member/account")

		await page.getByText("Player Profile").waitFor()

		// Capture original phone number from view mode
		const phoneRow = page.locator("dt", { hasText: "Phone" }).locator("..")
		const originalPhone = await phoneRow.locator("dd").textContent()

		// Enter edit mode
		const editButton = page.getByRole("button", { name: /edit/i }).first()
		await editButton.click()

		const phoneInput = page.getByLabel("Phone Number")
		await expect(phoneInput).toBeVisible()

		// Toggle phone number to a different value and save
		const testPhone = "612-555-0199"
		const currentValue = await phoneInput.inputValue()
		const newPhone = currentValue === testPhone ? "612-555-0100" : testPhone
		await phoneInput.fill(newPhone)
		await page.getByRole("button", { name: /save/i }).click()

		// Verify we return to view mode (save succeeded)
		await expect(editButton).toBeVisible({ timeout: 10_000 })

		// Restore original value
		await editButton.click()
		await expect(phoneInput).toBeVisible()
		await phoneInput.fill(originalPhone === "Not given" ? "" : (originalPhone ?? ""))
		await page.getByRole("button", { name: /save/i }).click()
		await expect(editButton).toBeVisible({ timeout: 10_000 })
	})

	test("password section renders with change button", async ({ page }) => {
		await page.goto("/member/account")

		await page.getByText("Password", { exact: true }).waitFor()
		await expect(page.getByText("Password", { exact: true })).toBeVisible()
		await expect(page.getByRole("button", { name: /change/i })).toBeVisible()
	})
})
