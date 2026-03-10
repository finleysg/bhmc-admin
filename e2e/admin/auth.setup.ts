import { test as setup } from "@playwright/test"
import { adminUser } from "../fixtures/test-accounts"

const authFile = "playwright/.auth/admin.json"

setup("authenticate admin", async ({ page }) => {
	await page.goto("/sign-in")
	await page.getByPlaceholder("Enter your email").fill(adminUser.email)
	await page.getByPlaceholder("Enter your password").fill(adminUser.password)
	await page.getByRole("button", { name: "Sign In" }).click()

	await page.waitForURL(/^(?!.*\/sign-in)/, { timeout: 15000 })

	await page.context().storageState({ path: authFile })
})
