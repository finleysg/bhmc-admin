import { test as setup } from "@playwright/test"
import { testUser } from "../fixtures/test-accounts"

const authFile = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
	await page.goto("/sign-in")
	await page.getByLabel("Email").fill(testUser.email)
	await page.getByLabel("Password").fill(testUser.password)
	await page.getByRole("button", { name: "Sign In" }).click()

	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15000 })

	await page.context().storageState({ path: authFile })
})
