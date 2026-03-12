import { expect, test } from "@playwright/test"
import { getMember, testPassword } from "../fixtures/test-accounts"
import { queryDb } from "../fixtures/db-helper"

const DJANGO_URL = "http://localhost:8000"

type PlayerRow = { email: string }
type AuthUserRow = { email: string; username: string }

test.describe.serial("player email sync", () => {
	const member = getMember(1)!
	let originalEmail: string

	test.beforeAll(async () => {
		const [row] = await queryDb<PlayerRow>("SELECT email FROM register_player WHERE id = ?", [
			member.player_id,
		])
		originalEmail = row.email
	})

	test.afterAll(async () => {
		// Restore original email via direct DB update to guarantee cleanup
		await queryDb("UPDATE register_player SET email = ? WHERE id = ?", [
			originalEmail,
			member.player_id,
		])
		await queryDb("UPDATE auth_user SET email = ?, username = ? WHERE id = ?", [
			originalEmail,
			originalEmail,
			member.user_id,
		])
	})

	test("admin update syncs email to auth_user", async ({ request }) => {
		const testEmail = `e2e-admin-sync-${Date.now()}@test.bhmc.org`

		const res = await request.patch(`/api/registration/players/${member.player_id}`, {
			data: { email: testEmail },
		})
		expect(res.ok()).toBe(true)

		const [player] = await queryDb<PlayerRow>("SELECT email FROM register_player WHERE id = ?", [
			member.player_id,
		])
		const [user] = await queryDb<AuthUserRow>(
			"SELECT email, username FROM auth_user WHERE id = ?",
			[member.user_id],
		)

		expect(player.email).toBe(testEmail)
		expect(user.email).toBe(testEmail)
		expect(user.username).toBe(testEmail)

		// Restore for next test so the member can still log in
		const restore = await request.patch(`/api/registration/players/${member.player_id}`, {
			data: { email: originalEmail },
		})
		expect(restore.ok()).toBe(true)
	})

	test("user update syncs email to auth_user", async () => {
		const testEmail = `e2e-user-sync-${Date.now()}@test.bhmc.org`

		// Login as the test member
		const loginRes = await fetch(`${DJANGO_URL}/auth/token/login/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: originalEmail, password: testPassword }),
		})
		expect(loginRes.ok).toBe(true)

		const cookie = loginRes.headers.getSetCookie?.().find((c) => c.startsWith("access_token="))
		const token = cookie?.split("=")[1]?.split(";")[0]
		expect(token).toBeTruthy()

		// Get current player data from Django
		const getRes = await fetch(`${DJANGO_URL}/api/players/${member.player_id}/`, {
			headers: { Authorization: `Token ${token}` },
		})
		const currentPlayer = (await getRes.json()) as Record<string, unknown>

		// PUT to Django with full payload, changing only email
		const updateRes = await fetch(`${DJANGO_URL}/api/players/${member.player_id}/`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Token ${token}`,
			},
			body: JSON.stringify({ ...currentPlayer, email: testEmail }),
		})
		const updateBody = await updateRes.text()
		expect(updateRes.ok, `Django PUT failed (${updateRes.status}): ${updateBody}`).toBe(true)

		const [player] = await queryDb<PlayerRow>("SELECT email FROM register_player WHERE id = ?", [
			member.player_id,
		])
		const [user] = await queryDb<AuthUserRow>(
			"SELECT email, username FROM auth_user WHERE id = ?",
			[member.user_id],
		)

		expect(player.email).toBe(testEmail)
		expect(user.email).toBe(testEmail)
	})
})
