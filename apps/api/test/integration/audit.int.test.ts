import { eq } from "drizzle-orm"

import { adminAuditEntry, authUserGroups, player } from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createUser, TestUser } from "./support/factories"

const auditEntries = () => testDb().select().from(adminAuditEntry)

describe("admin audit record", () => {
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

	describe("setting admin roles", () => {
		it("records who changed which player's roles, from where, and what changed", async () => {
			const target = await createUser()

			await t
				.http(clubAdmin)
				.put(`/players/${target.playerId}/roles`)
				.send({ roles: ["event-admin", "club-admin"] })

			const entries = await auditEntries()
			expect(entries).toHaveLength(1)
			expect(entries[0]).toMatchObject({
				actorId: clubAdmin.id,
				client: "ui",
				operation: "player.roles.update",
				entityType: "player",
				entityId: target.playerId,
				eventId: null,
				changes: { roles: { before: [], after: ["club-admin", "event-admin"] } },
			})
			expect(entries[0].createdAt).toBeTruthy()
		})

		it("records the CLI as the client when it says so", async () => {
			const target = await createUser()

			await t
				.http(clubAdmin)
				.put(`/players/${target.playerId}/roles`)
				.set("X-Admin-Client", "cli")
				.send({ roles: ["event-admin"] })

			expect((await auditEntries())[0]).toMatchObject({ client: "cli" })
		})

		it("records nothing when the roles do not change", async () => {
			const target = await createUser()
			const put = () =>
				t
					.http(clubAdmin)
					.put(`/players/${target.playerId}/roles`)
					.send({ roles: ["event-admin"] })

			await put()
			await put()

			expect(await auditEntries()).toHaveLength(1)
		})

		it("rolls back the change when the audit entry cannot be written", async () => {
			const target = await createUser()
			// An actor with no auth_user row makes the audit insert fail its foreign key.
			const ghost = { ...clubAdmin, id: 999999 }

			const res = await t
				.http(ghost)
				.put(`/players/${target.playerId}/roles`)
				.send({ roles: ["club-admin"] })

			expect(res.ok).toBe(false)
			expect(
				await testDb().select().from(authUserGroups).where(eq(authUserGroups.userId, target.id)),
			).toEqual([])
			expect(await auditEntries()).toEqual([])
		})
	})

	describe("updating a player", () => {
		it("records only the fields that changed", async () => {
			const target = await createUser()

			await t.http(clubAdmin).patch(`/registration/players/${target.playerId}`).send({
				firstName: target.firstName,
				lastName: target.lastName,
				email: target.email,
				phoneNumber: "612-555-0100",
				isMember: false,
			})

			const entries = await auditEntries()
			expect(entries).toHaveLength(1)
			expect(entries[0]).toMatchObject({
				actorId: clubAdmin.id,
				operation: "player.update",
				entityType: "player",
				entityId: target.playerId,
				changes: {
					phoneNumber: { before: null, after: "612-555-0100" },
					isMember: { before: true, after: false },
				},
			})
		})

		it("records nothing when no field changes", async () => {
			const target = await createUser()

			await t
				.http(clubAdmin)
				.patch(`/registration/players/${target.playerId}`)
				.send({ firstName: target.firstName, isMember: true })

			expect(await auditEntries()).toEqual([])
		})

		it("rolls back the change when the audit entry cannot be written", async () => {
			const target = await createUser()
			const ghost = { ...clubAdmin, id: 999999 }

			const res = await t
				.http(ghost)
				.patch(`/registration/players/${target.playerId}`)
				.send({ phoneNumber: "612-555-0100" })

			expect(res.ok).toBe(false)
			const [row] = await testDb().select().from(player).where(eq(player.id, target.playerId))
			expect(row.phoneNumber).toBeNull()
		})
	})
})
