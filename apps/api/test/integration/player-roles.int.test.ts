import { eq } from "drizzle-orm"

import { authGroup, authUserGroups, player } from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createUser, TestUser } from "./support/factories"

/** Group names the user belongs to, read straight from auth_user_groups. */
async function groupsOf(userId: number): Promise<string[]> {
	const rows = await testDb()
		.select({ name: authGroup.name })
		.from(authUserGroups)
		.innerJoin(authGroup, eq(authGroup.id, authUserGroups.groupId))
		.where(eq(authUserGroups.userId, userId))
	return rows.map((r) => r.name).sort()
}

async function addToGroup(userId: number, name: string): Promise<void> {
	const db = testDb()
	let [group] = await db.select().from(authGroup).where(eq(authGroup.name, name))
	if (!group) {
		await db.insert(authGroup).values({ name })
		;[group] = await db.select().from(authGroup).where(eq(authGroup.name, name))
	}
	await db.insert(authUserGroups).values({ userId, groupId: group.id })
}

describe("/players/:playerId/roles", () => {
	let t: TestApp
	let clubAdmin: TestUser

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		clubAdmin = await createUser({ roles: ["club-admin"] })
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	it("returns the player's admin roles", async () => {
		const target = await createUser()
		await addToGroup(target.id, "Event Admin")

		const res = await t.http(clubAdmin).get(`/players/${target.playerId}/roles`)

		expect(res.status).toBe(200)
		expect(res.body).toEqual({ roles: ["event-admin"], isSuperuser: false })
	})

	it("reports a superuser", async () => {
		const target = await createUser({ superuser: true })

		const res = await t.http(clubAdmin).get(`/players/${target.playerId}/roles`)

		expect(res.body).toEqual({ roles: [], isSuperuser: true })
	})

	it("grants roles by adding group memberships", async () => {
		const target = await createUser()

		const res = await t
			.http(clubAdmin)
			.put(`/players/${target.playerId}/roles`)
			.send({ roles: ["event-admin", "club-admin"] })

		expect(res.status).toBe(200)
		expect(res.body).toEqual({ roles: ["club-admin", "event-admin"], isSuperuser: false })
		expect(await groupsOf(target.id)).toEqual(["Club Admin", "Event Admin"])
	})

	it("revokes roles and leaves other groups alone", async () => {
		const target = await createUser()
		await addToGroup(target.id, "Event Admin")
		await addToGroup(target.id, "Club Admin")
		await addToGroup(target.id, "Paul Helpers")

		const res = await t
			.http(clubAdmin)
			.put(`/players/${target.playerId}/roles`)
			.send({ roles: ["club-admin"] })

		expect(res.status).toBe(200)
		expect(await groupsOf(target.id)).toEqual(["Club Admin", "Paul Helpers"])
	})

	it("is idempotent", async () => {
		const target = await createUser()
		const put = () =>
			t
				.http(clubAdmin)
				.put(`/players/${target.playerId}/roles`)
				.send({ roles: ["event-admin"] })

		await put()
		const res = await put()

		expect(res.status).toBe(200)
		expect(await groupsOf(target.id)).toEqual(["Event Admin"])
	})

	it("rejects an unknown role", async () => {
		const target = await createUser()

		const res = await t
			.http(clubAdmin)
			.put(`/players/${target.playerId}/roles`)
			.send({ roles: ["super-admin"] })

		expect(res.status).toBe(400)
		expect(await groupsOf(target.id)).toEqual([])
	})

	it("returns 409 for a player without a login account", async () => {
		const target = await createUser()
		await testDb().update(player).set({ userId: null }).where(eq(player.id, target.playerId))

		const res = await t.http(clubAdmin).get(`/players/${target.playerId}/roles`)

		expect(res.status).toBe(409)
	})

	it("returns 404 for an unknown player", async () => {
		const res = await t.http(clubAdmin).get("/players/999999/roles")
		expect(res.status).toBe(404)
	})

	it("forbids an Event Admin", async () => {
		const eventAdmin = await createUser({ roles: ["event-admin"] })
		const target = await createUser()

		const res = await t
			.http(eventAdmin)
			.put(`/players/${target.playerId}/roles`)
			.send({ roles: ["club-admin"] })

		expect(res.status).toBe(403)
		expect(await groupsOf(target.id)).toEqual([])
	})
})
