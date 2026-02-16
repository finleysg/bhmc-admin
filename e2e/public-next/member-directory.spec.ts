import { test, expect } from "@playwright/test"

test.describe("Member Directory", () => {
	test("directory page renders", async ({ page }) => {
		await page.goto("/member/directory")

		await expect(page.getByText("Member Directory")).toBeVisible()
		await expect(page.getByPlaceholder(/search by name/i)).toBeVisible()
	})
})
