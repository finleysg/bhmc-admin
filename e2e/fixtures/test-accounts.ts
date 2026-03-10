import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const testUser = {
	email: process.env.E2E_USER_EMAIL ?? "finleysg@zoho.com",
	password: process.env.E2E_USER_PASSWORD ?? "sverige8",
}

export const adminUser = {
	email: process.env.E2E_ADMIN_EMAIL ?? "finleysg@gmail.com",
	password: process.env.E2E_USER_PASSWORD ?? "sverige8",
}

export const testPassword = process.env.E2E_USER_PASSWORD ?? "sverige8"

type TestUser = {
	email: string
	player_id: number
	user_id: number
	first_name: string
	last_name: string
	is_member: boolean
	last_season: number | null
}

function loadTestUsers(): Record<string, TestUser> {
	const filePath = path.join(__dirname, "..", "playwright", ".test-users.json")
	if (!fs.existsSync(filePath)) return {}
	return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

const testUsersData = loadTestUsers()

export function getTestUser(email: string): TestUser | undefined {
	return testUsersData[email]
}

/** Get a member by index (1–12). */
export function getMember(index: number): TestUser | undefined {
	return testUsersData[`member-${String(index).padStart(2, "0")}@test.bhmc.org`]
}
