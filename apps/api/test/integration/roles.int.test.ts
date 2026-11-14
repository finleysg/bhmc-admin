import type { AdminRole } from "@repo/domain/types"

import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

// Authorization only: each case asserts the guard's decision, not the payload.
describe("admin roles (ADR 0003)", () => {
	let t: TestApp
	let eventId: number
	const users: Record<string, TestUser> = {}

	beforeAll(async () => {
		t = await createTestApp()
		await resetDb()
		eventId = (await createEvent()).id
		users.member = await createUser()
		users.staff = await createUser({ staff: true })
		users.eventAdmin = await createUser({ roles: ["event-admin"] })
		users.clubAdmin = await createUser({ roles: ["club-admin"] })
		users.superuser = await createUser({ superuser: true })
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const endpoints: {
		name: string
		call: (u: TestUser) => Promise<{ status: number }>
		allowed: AdminRole[]
	}[] = [
		{
			name: "GET finance report",
			call: (u) => t.http(u).get(`/reports/events/${eventId}/finance`),
			allowed: ["event-admin"],
		},
		{
			name: "GET announcements",
			call: (u) => t.http(u).get("/announcements"),
			allowed: ["club-admin"],
		},
		{
			name: "GET player search",
			call: (u) => t.http(u).get("/registration/players?searchText=test"),
			allowed: ["event-admin", "club-admin"],
		},
	]

	const roleOf: Record<string, AdminRole | null> = {
		member: null,
		staff: null,
		eventAdmin: "event-admin",
		clubAdmin: "club-admin",
	}

	for (const endpoint of endpoints) {
		describe(endpoint.name, () => {
			for (const [who, role] of Object.entries(roleOf)) {
				const allowed = role !== null && endpoint.allowed.includes(role)
				it(`${allowed ? "allows" : "forbids"} ${who}`, async () => {
					const res = await endpoint.call(users[who])
					if (allowed) expect(res.status).not.toBe(403)
					else expect(res.status).toBe(403)
				})
			}

			it("allows a superuser", async () => {
				const res = await endpoint.call(users.superuser)
				expect(res.status).not.toBe(403)
			})
		})
	}

	it("rejects a request with no token", async () => {
		const res = await t.http().get("/announcements")
		expect(res.status).toBe(401)
	})
})
