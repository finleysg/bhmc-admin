import { test, expect } from "@playwright/test"

import { testPassword } from "../fixtures/test-accounts"
import { getAdminToken } from "../fixtures/test-event"

const DJANGO_URL = process.env.DJANGO_URL ?? "http://localhost:8000"
const MAILPIT_API = process.env.MAILPIT_API ?? "http://localhost:8025/api/v1"

const email = `e2e-signup-${Date.now()}@test.bhmc.org`
const firstName = "E2E"
const lastName = "Signup"

let token: string
let activationPath: string

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()

	// Clear any pre-existing Mailpit messages for this email
	try {
		const res = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email}`)}`)
		const data = (await res.json()) as { messages: { ID: string }[] }
		for (const msg of data.messages ?? []) {
			await fetch(`${MAILPIT_API}/messages`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ IDs: [msg.ID] }),
			})
		}
	} catch {
		// Ignore cleanup errors
	}
})

test("creates account and shows confirmation page", async ({ page }) => {
	await page.goto("/sign-up")

	await page.getByLabel("First Name").fill(firstName)
	await page.getByLabel("Last Name").fill(lastName)
	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password", { exact: true }).fill(testPassword)
	await page.getByLabel("Confirm Password").fill(testPassword)
	await page.getByRole("button", { name: "Create Account" }).click()

	await page.waitForURL("**/sign-up/confirm**", { timeout: 15_000 })
	await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible()
	await expect(page.getByText(email)).toBeVisible()
})

test("activation email is received with valid activation link", async () => {
	let emailHtml = ""

	await expect(async () => {
		const res = await fetch(
			`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email} subject:Account Activation`)}`,
		)
		const data = (await res.json()) as { messages_count: number; messages: { ID: string }[] }
		expect(data.messages_count).toBeGreaterThan(0)

		const emailRes = await fetch(`${MAILPIT_API}/message/${data.messages[0]!.ID}`)
		const emailData = (await emailRes.json()) as { HTML: string }
		emailHtml = emailData.HTML
	}).toPass({ timeout: 30_000, intervals: [2_000, 3_000, 5_000] })

	const match = emailHtml.match(/href="([^"]*\/activate\/[^"]+)"/)
	expect(match).not.toBeNull()

	const activationUrl = new URL(match![1]!)
	activationPath = activationUrl.pathname
	expect(activationPath).toMatch(/\/activate\/[^/]+\/[^/]+/)
})

test("activation link activates the account", async ({ page }) => {
	await page.goto(activationPath)

	await expect(page.getByRole("heading", { name: "Your Account is Active" })).toBeVisible({
		timeout: 15_000,
	})
	await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible()
})

test("activated user can sign in", async ({ page }) => {
	await page.goto("/sign-in")

	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()

	await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible({
		timeout: 15_000,
	})
})

test.afterAll(async () => {
	// Best-effort cleanup — errors swallowed
	try {
		// Delete player via admin API
		const playerRes = await fetch(`${DJANGO_URL}/api/players/?email=${encodeURIComponent(email)}`, {
			headers: { Authorization: `Token ${token}` },
		})
		if (playerRes.ok) {
			const players = (await playerRes.json()) as { id: number }[]
			for (const player of players) {
				await fetch(`${DJANGO_URL}/api/players/${player.id}/`, {
					method: "DELETE",
					headers: { Authorization: `Token ${token}` },
				})
			}
		}
	} catch {
		// Swallow
	}

	try {
		// Delete user: login as test user, then delete via djoser
		const loginRes = await fetch(`${DJANGO_URL}/auth/token/login/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password: testPassword }),
		})
		if (loginRes.ok) {
			const cookie = loginRes.headers.getSetCookie?.().find((c) => c.startsWith("access_token="))
			const userToken = cookie?.split("=")[1]?.split(";")[0]
			if (userToken) {
				await fetch(`${DJANGO_URL}/auth/users/me/`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Token ${userToken}`,
					},
					body: JSON.stringify({ current_password: testPassword }),
				})
			}
		}
	} catch {
		// Swallow
	}

	try {
		// Delete Mailpit messages for this email
		const res = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email}`)}`)
		const data = (await res.json()) as { messages: { ID: string }[] }
		const ids = (data.messages ?? []).map((m) => m.ID)
		if (ids.length > 0) {
			await fetch(`${MAILPIT_API}/messages`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ IDs: ids }),
			})
		}
	} catch {
		// Swallow
	}
})
