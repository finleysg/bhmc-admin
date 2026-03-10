import { expect, test } from "@playwright/test"

const testTitle = `E2E Test Announcement ${Date.now()}`
const testText = "This is an automated test announcement."

// Build datetime-local values: starts 1 hour ago, expires 1 year from now
const now = new Date()
const startsDate = new Date(now.getTime() - 60 * 60 * 1000)
const expiresDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

function toDatetimeLocal(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const startsValue = toDatetimeLocal(startsDate)
const expiresValue = toDatetimeLocal(expiresDate)

let createdAnnouncementId: number | null = null

test.afterAll(async ({ request }) => {
	if (createdAnnouncementId) {
		await request.delete(`/api/announcements/${createdAnnouncementId}`)
		await request.post("http://localhost:3200/api/revalidate", {
			data: { tag: "announcements" },
		})
	}
})

test("create announcement and verify on public site", async ({ page, request }) => {
	// Step 1: Navigate to create announcement
	await page.goto("/club/announcements/new")
	await page.getByText("New Announcement").waitFor()

	// Step 2: Fill the form
	await page.getByLabel("Title").fill(testTitle)

	const editor = page.locator('[contenteditable="true"]').first()
	await editor.click()
	await editor.pressSequentially(testText)

	await page.getByLabel("Starts").fill(startsValue)
	await page.getByLabel("Expires").fill(expiresValue)

	// Step 3: Save
	await page.getByRole("button", { name: "Save" }).click()

	// Wait for redirect to edit page
	await page.waitForURL(/\/club\/announcements\/\d+/)

	// Extract the announcement ID from the URL for cleanup
	const url = page.url()
	const idMatch = url.match(/\/club\/announcements\/(\d+)/)
	if (idMatch) {
		createdAnnouncementId = Number(idMatch[1])
	}

	// Verify toast
	await expect(page.getByText("Announcement created")).toBeVisible()

	// Step 4: Validate in admin listing
	await page.goto("/club/announcements")

	const row = page.locator("tr", { hasText: testTitle })
	await expect(row).toBeVisible()
	await expect(row.getByText("Active")).toBeVisible()

	// Verify dates contain reasonable formatted values (month abbrev, AM/PM)
	const rowText = await row.textContent()
	expect(rowText).toMatch(/\w{3}\s+\d{1,2},\s+\d{4}/)
	expect(rowText).toMatch(/[AP]M/)

	// Step 5: Validate on public-next home page
	await request.post("http://localhost:3200/api/revalidate", {
		data: { tag: "announcements" },
	})

	await page.goto("http://localhost:3200/")

	const announcementHeading = page.locator("h5", { hasText: testTitle })
	await expect(announcementHeading).toBeVisible({ timeout: 10000 })
	await expect(page.getByText(testText)).toBeVisible()
})
