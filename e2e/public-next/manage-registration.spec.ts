import { test, expect } from "@playwright/test"

import { getMember, testPassword } from "../fixtures/test-accounts"
import { createTestEvent, deleteTestEvent, getAdminToken } from "../fixtures/test-event"
import { warmCacheAndVerify } from "../fixtures/test-helpers"
import { createTestRegistration } from "../fixtures/test-registration"
import type { TestEvent } from "../fixtures/test-event"
import type { TestRegistration } from "../fixtures/test-registration"

const PUBLIC_NEXT_URL = "http://localhost:3200"

let token: string
let testEvent: TestEvent
let testRegistration: TestRegistration

const member1 = getMember(1)!
const member2 = getMember(2)!
const member3 = getMember(3)!
const member4 = getMember(4)!
const member5 = getMember(5)!

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
	token = await getAdminToken()
	// Use +8 days to avoid collisions with other specs (+1, +2, +5, +7)
	const startDate = new Date()
	startDate.setDate(startDate.getDate() + 8)
	testEvent = await createTestEvent(token, 914, startDate.toISOString().slice(0, 10))
	await warmCacheAndVerify(testEvent.eventUrl, testEvent.name)
	testRegistration = await createTestRegistration(token, testEvent.id, [member1, member2, member3])
})

test.afterAll(async () => {
	await deleteTestEvent(token, testEvent.id)
})

test("menu renders with all options", async ({ page }) => {
	test.setTimeout(90_000)

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage page
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)

	// Verify heading
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })

	// Verify all 6 action links are visible
	await expect(page.getByRole("link", { name: "Add Players" })).toBeVisible()
	await expect(page.getByRole("link", { name: "Drop Players" })).toBeVisible()
	await expect(page.getByRole("link", { name: "Move Group" })).toBeVisible()
	await expect(page.getByRole("link", { name: "Replace Player" })).toBeVisible()
	await expect(page.getByRole("link", { name: "Add Notes" })).toBeVisible()
	await expect(page.getByRole("link", { name: "Get in Skins" })).toBeVisible()

	// Verify Back button navigates to event detail
	await page.getByRole("link", { name: "Back" }).click()
	await page.waitForURL(`**${testEvent.eventUrl}`, { timeout: 10_000 })
})

test("add notes saves and persists", async ({ page }) => {
	test.setTimeout(90_000)

	const testNotes = "Please pair us with group on hole 5"

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Add Notes
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Add Notes" }).click()

	// Verify notes page loaded
	await expect(page.getByText("Notes / Player Requests")).toBeVisible({ timeout: 10_000 })

	// Type notes and save
	await page.locator("#manage-notes").fill(testNotes)
	await page.getByRole("button", { name: "Save" }).click()

	// Verify success toast and redirect back to manage
	await expect(page.getByText("Notes saved")).toBeVisible({ timeout: 10_000 })
	await page.waitForURL(`**/manage`, { timeout: 10_000 })

	// Verify notes persisted by revisiting
	await page.getByRole("link", { name: "Add Notes" }).click()
	await expect(page.locator("#manage-notes")).toHaveValue(testNotes, { timeout: 10_000 })
})

test("replace player swaps member-02 for member-04", async ({ page }) => {
	test.setTimeout(90_000)

	const member2Name = `${member2.first_name} ${member2.last_name}`
	const member4Name = `${member4.first_name} ${member4.last_name}`

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Replace Player
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Replace Player" }).click()

	// Verify replace page loaded
	await expect(page.getByText("Replace Player")).toBeVisible({ timeout: 10_000 })

	// Select member-02 as the player to replace
	await page.getByLabel(member2Name).check()

	// Search for member-04 as the replacement
	await page.getByPlaceholder("Search for player...").fill(member4.last_name)

	// Wait for search results and click member-04
	await page.getByText(member4Name).click()

	// Verify selected indicator
	await expect(page.getByText(`Selected: ${member4Name}`)).toBeVisible({ timeout: 5_000 })

	// Close combobox dropdown and click Replace
	await page.keyboard.press("Escape")
	await page.getByRole("button", { name: "Replace" }).click()

	// Verify success toast and redirect
	await expect(page.getByText(`${member2Name} replaced by ${member4Name}`)).toBeVisible({
		timeout: 10_000,
	})
	await page.waitForURL(`**/manage`, { timeout: 10_000 })
})

test("move group to a different spot", async ({ page }) => {
	test.setTimeout(90_000)

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Move Group
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Move Group" }).click()

	// Verify move page loaded
	await expect(page.getByText("Move Group")).toBeVisible({ timeout: 10_000 })

	// Select a course (template 914 has multiple courses)
	await page.getByRole("button", { name: "East" }).click()

	// Wait for spot selector to appear after course selection
	await expect(page.getByText("Select starting spot")).toBeVisible({ timeout: 10_000 })
	await page.getByRole("combobox").click()
	await page.getByRole("option").first().click()

	// Click Move
	await page.getByRole("button", { name: "Move" }).click()

	// Verify success toast and redirect
	await expect(page.getByText(/Group moved to/)).toBeVisible({ timeout: 10_000 })
	await page.waitForURL(`**/manage`, { timeout: 10_000 })
})

test("add players enters payment flow with member-05", async ({ page }) => {
	test.setTimeout(90_000)

	const member5Name = `${member5.first_name} ${member5.last_name}`

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Add Players
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Add Players" }).click()

	// Verify "Add Players" card heading visible
	await expect(page.getByText("Add Players").first()).toBeVisible({ timeout: 10_000 })

	// Verify slots available text shows "2 slots available"
	await expect(page.getByText("2 slots available")).toBeVisible()

	// Search for member-05 using PlayerPicker
	await page.getByPlaceholder("Search for player...").fill(member5.last_name)

	// Wait for search results and click member-05
	await page.getByText(member5Name).click()

	// Verify "Selected players" section appears with member-05 name
	await expect(page.getByText("Selected players")).toBeVisible({ timeout: 5_000 })
	await expect(page.getByText(member5Name)).toBeVisible()

	// Click Continue button
	await page.keyboard.press("Escape")
	await page.getByRole("button", { name: "Continue" }).click()

	// Verify navigation to /register page and payment flow entry
	await page.waitForURL(`**/register`, { timeout: 15_000 })
	await expect(page.getByText("Players and Fees")).toBeVisible({ timeout: 10_000 })

	// Navigate back to manage page using direct navigation (bypasses client-side guards)
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
})

test("drop player removes member-03 from group", async ({ page }) => {
	test.setTimeout(90_000)

	const member3Name = `${member3.first_name} ${member3.last_name}`

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Drop Players
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Drop Players" }).click()

	// Verify drop page loaded
	await expect(page.getByText("Drop Players").first()).toBeVisible({ timeout: 10_000 })

	// Select member-03 to drop
	await page.getByLabel(member3Name).check()

	// Click Drop button
	await page.getByRole("button", { name: "Drop" }).click()

	// Confirm in dialog
	await expect(page.getByText("Are you sure you want to remove 1 player(s)")).toBeVisible({
		timeout: 5_000,
	})
	await page.getByRole("button", { name: "Confirm" }).click()

	// Verify success toast and redirect back to manage
	await expect(page.getByText("1 player(s) dropped")).toBeVisible({ timeout: 10_000 })
	await page.waitForURL(`**/manage`, { timeout: 10_000 })
})

test("drop self redirects to event page", async ({ page }) => {
	test.setTimeout(90_000)

	const member1Name = `${member1.first_name} ${member1.last_name}`

	// Sign in as member-01
	await page.goto(`${PUBLIC_NEXT_URL}/sign-in`)
	await page.getByLabel("Email").fill(member1.email)
	await page.getByLabel("Password").fill(testPassword)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.getByRole("button", { name: "Account menu" }).waitFor({ timeout: 15_000 })

	// Navigate to manage → Drop Players
	await page.goto(`${PUBLIC_NEXT_URL}${testEvent.eventUrl}/manage`)
	await expect(page.getByText("Manage My Group")).toBeVisible({ timeout: 15_000 })
	await page.getByRole("link", { name: "Drop Players" }).click()

	// Verify drop page loaded
	await expect(page.getByText("Drop Players").first()).toBeVisible({ timeout: 10_000 })

	// Select member-01 (self) to drop
	await page.getByLabel(member1Name).check()

	// Click Drop button
	await page.getByRole("button", { name: "Drop" }).click()

	// Confirm in dialog
	await page.getByRole("button", { name: "Confirm" }).click()

	// Verify success toast
	await expect(page.getByText("1 player(s) dropped")).toBeVisible({ timeout: 10_000 })

	// Verify redirect to event detail page (not manage)
	await page.waitForURL(`**${testEvent.eventUrl}`, { timeout: 10_000 })

	// Verify manage button is no longer visible (no registration)
	await expect(page.getByRole("link", { name: "Manage" })).not.toBeVisible({ timeout: 5_000 })
})
