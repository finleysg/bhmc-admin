import * as fs from "node:fs"
import * as path from "node:path"

const DJANGO_URL = process.env.DJANGO_URL ?? "http://localhost:8000"
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "finleysg@gmail.com"
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "sverige8"

async function getAdminToken(): Promise<string | null> {
	const res = await fetch(`${DJANGO_URL}/auth/token/login/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
	})
	if (!res.ok) return null
	const cookie = res.headers.getSetCookie?.().find((c) => c.startsWith("access_token="))
	return cookie?.split("=")[1]?.split(";")[0] ?? null
}

async function globalSetup() {
	const token = await getAdminToken()
	if (!token) {
		console.warn("⚠ Could not authenticate admin, skipping test user seeding")
		return
	}

	const res = await fetch(`${DJANGO_URL}/api/create-test-users/`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Token ${token}`,
		},
	})
	if (!res.ok) {
		console.warn(`⚠ Failed to seed test users (${res.status}): ${await res.text()}`)
		return
	}

	const data = await res.json()
	const allUsers = [...data.created, ...data.existing]
	const byEmail: Record<string, (typeof allUsers)[number]> = {}
	for (const u of allUsers) {
		byEmail[u.email] = u
	}

	const outDir = path.join(__dirname, "playwright")
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true })
	}
	fs.writeFileSync(
		path.join(outDir, ".test-users.json"),
		JSON.stringify(byEmail, null, "\t") + "\n",
	)
	console.log(`✓ Test users: ${data.created.length} created, ${data.existing.length} existing`)
}

export default globalSetup
