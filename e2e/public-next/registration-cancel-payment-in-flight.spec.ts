import { test, expect } from "@playwright/test"

import { queryDb } from "../fixtures/db-helper"
import { getMember, testPassword } from "../fixtures/test-accounts"
import { createTestEvent, deleteTestEvent, getAdminToken } from "../fixtures/test-event"
import { warmCacheAndVerify } from "../fixtures/test-helpers"
import type { TestEvent } from "../fixtures/test-event"

const PUBLIC_NEXT_URL = "http://localhost:3200"

let token: string
let testEvent: TestEvent

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()
	// Avoid date collision with other specs
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 11)
	testEvent = await createTestEvent(token, undefined, startDate.toISOString().slice(0, 10))
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test("cancel is refused with 409 when the registration's payment has been confirmed", async ({
	page,
}) => {
	test.setTimeout(120_000)
	const member = getMember(8)!

	// Sign in
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// GIVEN: Member walks through registration far enough to create a payment
	// row tied to the registration. We stop on the /payment page; at this point
	// the registration exists with AWAITING_PAYMENT slots and a pending payment.
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}`)
	await page.getByRole("link", { name: "Sign Up" }).click()
	await page.waitForURL("**/reserve")

	const enabledSelect = page
		.getByRole("button", { name: "Select" })
		.and(page.locator(":not([disabled])"))
	await expect(enabledSelect.first()).toBeVisible({ timeout: 30_000 })
	const groupRow = enabledSelect.first().locator("../..")
	await groupRow.getByRole("button", { name: "Open" }).first().click()
	const registerButton = groupRow.getByRole("button", { name: "Register" })
	await expect(registerButton).toBeEnabled({ timeout: 30_000 })
	await registerButton.click()
	await page.waitForURL("**/register", { timeout: 10_000 })
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })

	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/review", { timeout: 10_000 })
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL("**/payment", { timeout: 10_000 })

	// AND: Simulate the race window — Stripe captured the charge before the
	// webhook fired. We mark the underlying payment as confirmed in the DB so
	// the cancel guard sees a captured payment.
	const userIdRow = await queryDb<{ id: number }>("SELECT id FROM auth_user WHERE email = ?", [
		member.email,
	])
	const userId = userIdRow[0]!.id

	// savePayment is async — wait briefly for the row to appear in the DB.
	let paymentId = 0
	await expect(async () => {
		const rows = await queryDb<{ id: number }>(
			`SELECT id FROM payments_payment WHERE user_id = ? AND event_id = ?
			 ORDER BY id DESC LIMIT 1`,
			[userId, testEvent.id],
		)
		expect(rows.length).toBeGreaterThan(0)
		paymentId = rows[0]!.id
	}).toPass({ timeout: 10_000, intervals: [250, 500, 1000] })

	await queryDb(
		`UPDATE payments_payment
		   SET payment_code = 'pi_test_inflight', confirmed = 1
		 WHERE id = ?`,
		[paymentId],
	)

	// WHEN: The user clicks Cancel (or the navigation guard fires) → cancel
	// endpoint is invoked. The CancelButton uses the same mutation, so we test
	// it by making the request directly with the page's cookies.
	const regRow = await queryDb<{ id: number }>(
		`SELECT id FROM register_registration
		 WHERE user_id = ? AND event_id = ?
		 ORDER BY id DESC LIMIT 1`,
		[userId, testEvent.id],
	)
	const registrationId = regRow[0]!.id
	const cancelResponse = await page.request.put(
		`${PUBLIC_NEXT_URL}/api/registration/${registrationId}/cancel`,
		{ data: { reason: "user" } },
	)

	// THEN: API refuses with 409 — captured payment must not be silently abandoned.
	expect(cancelResponse.status()).toBe(409)
	const bodyText = await cancelResponse.text()
	expect(bodyText).toMatch(/in flight|already captured/i)

	// AND: Registration is preserved (userId still attached, slots still belong
	// to the registration). Without the guard, the cancel would have set
	// userId=null and released the slots, enabling a duplicate registration.
	const fetched = await queryDb<{ user_id: number | null }>(
		"SELECT user_id FROM register_registration WHERE id = ?",
		[registrationId],
	)
	expect(fetched[0]!.user_id).not.toBeNull()
	const slotRows = await queryDb<{ status: string }>(
		"SELECT status FROM register_registrationslot WHERE registration_id = ?",
		[registrationId],
	)
	expect(slotRows.length).toBeGreaterThan(0)
	for (const slot of slotRows) {
		// Slots must NOT be released to AVAILABLE (A). Whatever pre-cancel
		// state they had (PENDING/AWAITING_PAYMENT) must be preserved so the
		// captured payment isn't orphaned.
		expect(slot.status).not.toBe("A")
	}

	// Cleanup: undo the fake captured-payment state and let the normal cancel
	// path run (no longer blocked) so afterAll's deleteTestEvent succeeds.
	await queryDb(
		`UPDATE payments_payment SET payment_code = 'pending', confirmed = 0 WHERE id = ?`,
		[paymentId],
	)
	const cleanupResponse = await page.request.put(
		`${PUBLIC_NEXT_URL}/api/registration/${registrationId}/cancel`,
		{ data: { reason: "user" } },
	)
	expect(cleanupResponse.ok()).toBeTruthy()
})
