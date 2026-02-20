const DJANGO_URL = process.env.DJANGO_URL ?? "http://localhost:8000"
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "finleysg@gmail.com"
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "sverige8"

export type TestEvent = {
	id: number
	name: string
	startDate: string
	slug: string
	eventUrl: string
	reserveUrl: string
}

export async function getAdminToken(): Promise<string> {
	const res = await fetch(`${DJANGO_URL}/auth/token/login/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
	})
	if (!res.ok) {
		throw new Error(`Admin auth failed (${res.status}): ${await res.text()}`)
	}
	const cookie = res.headers.getSetCookie?.().find((c) => c.startsWith("access_token="))
	const token = cookie?.split("=")[1]?.split(";")[0]
	if (!token) {
		throw new Error("Admin auth succeeded but no access_token cookie found")
	}
	return token
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\//g, " ")
		.replace(/\s+/g, "-")
		.replace(/[^\w-]/g, "")
		.replace(/-{2,}/g, "-")
}

function tomorrow(): string {
	const d = new Date()
	d.setDate(d.getDate() + 1)
	return d.toISOString().slice(0, 10)
}

export async function createTestEvent(
	token: string,
	templateId = 914,
	startDate?: string,
): Promise<TestEvent> {
	const date = startDate ?? tomorrow()

	// 1. Copy the template event
	const copyRes = await fetch(
		`${DJANGO_URL}/api/events/${templateId}/copy_event/?start_dt=${date}`,
		{
			method: "POST",
			headers: { Authorization: `Token ${token}` },
		},
	)
	if (!copyRes.ok) {
		throw new Error(
			`Failed to copy event ${templateId} (${copyRes.status}): ${await copyRes.text()}`,
		)
	}
	const copyData = await copyRes.json()
	const newId: number = copyData.id
	const name: string = copyData.name

	// 2. Create registration slots
	const slotsRes = await fetch(`${DJANGO_URL}/api/events/${newId}/create_slots/`, {
		method: "POST",
		headers: { Authorization: `Token ${token}` },
	})
	if (!slotsRes.ok) {
		throw new Error(
			`Failed to create slots for event ${newId} (${slotsRes.status}): ${await slotsRes.text()}`,
		)
	}

	// 3. Open registration windows
	const now = new Date()
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
	const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
	const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
	const fortyEightHours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

	const patchRes = await fetch(`${DJANGO_URL}/api/events/${newId}/`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Token ${token}`,
		},
		body: JSON.stringify({
			priority_signup_start: oneHourAgo.toISOString(),
			signup_start: thirtyMinAgo.toISOString(),
			signup_end: twentyFourHours.toISOString(),
			payments_end: fortyEightHours.toISOString(),
		}),
	})
	if (!patchRes.ok) {
		throw new Error(
			`Failed to update registration windows for event ${newId} (${patchRes.status}): ${await patchRes.text()}`,
		)
	}

	const slug = slugify(name)
	const eventUrl = `/event/${date}/${slug}`
	return {
		id: newId,
		name,
		startDate: date,
		slug,
		eventUrl,
		reserveUrl: `${eventUrl}/reserve`,
	}
}

export async function deleteTestEvent(token: string, eventId: number): Promise<void> {
	try {
		await fetch(`${DJANGO_URL}/api/events/${eventId}/`, {
			method: "DELETE",
			headers: { Authorization: `Token ${token}` },
		})
	} catch {
		// Swallow errors during cleanup
	}
}
