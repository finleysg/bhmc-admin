import { test, expect } from "@playwright/test"

import { testPassword } from "../fixtures/test-accounts"
import { getAdminToken } from "../fixtures/test-event"

const DJANGO_URL = process.env.DJANGO_URL ?? "http://localhost:8000"
const MAILPIT_API = process.env.MAILPIT_API ?? "http://localhost:8025/api/v1"

const email = `e2e-reset-${Date.now()}@test.bhmc.org`
const firstName = "E2E"
const lastName = "Reset"
const newPassword = `${testPassword}-reset`

let token: string
let resetPath: string

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()

	// 1. Create user account via Django API
	const createRes = await fetch(`${DJANGO_URL}/auth/users/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email,
			password: testPassword,
			re_password: testPassword,
			first_name: firstName,
			last_name: lastName,
			ghin: "",
		}),
	})
	if (!createRes.ok) {
		throw new Error(`Failed to create user (${createRes.status}): ${await createRes.text()}`)
	}

	// 2. Activate via Mailpit: poll for activation email, extract link, call activation endpoint
	let activationUid = ""
	let activationToken = ""

	await expect(async () => {
		const res = await fetch(
			`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email} subject:Account Activation`)}`,
		)
		const data = (await res.json()) as { messages_count: number; messages: { ID: string }[] }
		expect(data.messages_count).toBeGreaterThan(0)

		const emailRes = await fetch(`${MAILPIT_API}/message/${data.messages[0]!.ID}`)
		const emailData = (await emailRes.json()) as { HTML: string }
		const match = emailData.HTML.match(/href="([^"]*\/activate\/([^/]+)\/([^"]+))"/)
		expect(match).not.toBeNull()
		activationUid = match![2]!
		activationToken = match![3]!
	}).toPass({ timeout: 30_000, intervals: [2_000, 3_000, 5_000] })

	const activateRes = await fetch(`${DJANGO_URL}/auth/users/activation/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ uid: activationUid, token: activationToken }),
	})
	if (!activateRes.ok) {
		throw new Error(`Failed to activate user (${activateRes.status}): ${await activateRes.text()}`)
	}

	// 3. Clear Mailpit messages so password reset email search is clean
	try {
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
		// Ignore cleanup errors
	}
})

test("submits reset request and shows confirmation", async ({ page }) => {
	await page.goto("/reset-password")

	await page.getByLabel("Email").fill(email)
	await page.getByRole("button", { name: "Send Reset Link" }).click()

	await page.waitForURL("**/reset-password/sent**", { timeout: 15_000 })
	await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible()
	await expect(page.getByText(email)).toBeVisible()
})

test("password reset email is received with valid link", async () => {
	let emailHtml = ""

	await expect(async () => {
		const res = await fetch(
			`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email} subject:Password Reset`)}`,
		)
		const data = (await res.json()) as { messages_count: number; messages: { ID: string }[] }
		expect(data.messages_count).toBeGreaterThan(0)

		const emailRes = await fetch(`${MAILPIT_API}/message/${data.messages[0]!.ID}`)
		const emailData = (await emailRes.json()) as { HTML: string }
		emailHtml = emailData.HTML
	}).toPass({ timeout: 30_000, intervals: [2_000, 3_000, 5_000] })

	const match = emailHtml.match(/href="([^"]*\/reset-password\/[^"]+)"/)
	expect(match).not.toBeNull()

	const resetUrl = new URL(match![1]!)
	resetPath = resetUrl.pathname
	expect(resetPath).toMatch(/\/reset-password\/[^/]+\/[^/]+/)
})

test("reset form accepts new password", async ({ page }) => {
	await page.goto(resetPath)

	await expect(page.getByRole("heading", { name: "Set New Password" })).toBeVisible({
		timeout: 15_000,
	})

	await page.getByLabel("New Password", { exact: true }).fill(newPassword)
	await page.getByLabel("Confirm New Password").fill(newPassword)
	await page.getByRole("button", { name: "Reset Password" }).click()

	await page.waitForURL("**/reset-password/complete**", { timeout: 15_000 })
	await expect(page.getByRole("heading", { name: "Password Reset Complete" })).toBeVisible()
})

test("user can sign in with new password", async ({ page }) => {
	await page.goto("/sign-in")

	await page.getByLabel("Email").fill(email)
	await page.getByLabel("Password").fill(newPassword)
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
			body: JSON.stringify({ email, password: newPassword }),
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
					body: JSON.stringify({ current_password: newPassword }),
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
