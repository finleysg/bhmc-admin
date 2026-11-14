import { eq } from "drizzle-orm"

import { RegistrationStatusChoices } from "@repo/domain/types"

import { registrationChangeLog, registrationSlot } from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createRegistration, createUser } from "./support/factories"

describe("POST /registration/:eventId/drop-players", () => {
	let t: TestApp

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const slot = async (id: number) =>
		(await testDb().select().from(registrationSlot).where(eq(registrationSlot.id, id)))[0]

	it("lets a group member drop a partner, freeing the slot", async () => {
		const evt = await createEvent()
		const [me, partner] = [await createUser(), await createUser()]
		const reg = await createRegistration(evt.id, [me, partner])

		const res = await t
			.http(me)
			.post(`/registration/${evt.id}/drop-players`)
			.send({ registrationId: reg.id, slotIds: [reg.slotIds[1]] })

		expect(res.status).toBe(201)
		expect(await slot(reg.slotIds[1])).toMatchObject({
			status: RegistrationStatusChoices.AVAILABLE,
			playerId: null,
			registrationId: null,
		})
		expect(await slot(reg.slotIds[0])).toMatchObject({
			status: RegistrationStatusChoices.RESERVED,
			playerId: me.playerId,
		})
	})

	it("records the drop in the registration change log", async () => {
		const evt = await createEvent()
		const [me, partner] = [await createUser(), await createUser()]
		const reg = await createRegistration(evt.id, [me, partner])

		await t
			.http(me)
			.post(`/registration/${evt.id}/drop-players`)
			.send({ registrationId: reg.id, slotIds: [reg.slotIds[1]] })

		// The change log is written fire-and-forget after the response, so poll briefly.
		let rows: (typeof registrationChangeLog.$inferSelect)[] = []
		for (let i = 0; i < 20 && rows.length === 0; i++) {
			rows = await testDb()
				.select()
				.from(registrationChangeLog)
				.where(eq(registrationChangeLog.registrationId, reg.id))
			if (rows.length === 0) await new Promise((r) => setTimeout(r, 50))
		}
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({ action: "drop", actorId: me.id, isAdmin: 0 })
	})

	it("forbids a member who is not in the group", async () => {
		const evt = await createEvent()
		const [owner, partner, outsider] = [await createUser(), await createUser(), await createUser()]
		const reg = await createRegistration(evt.id, [owner, partner])

		const res = await t
			.http(outsider)
			.post(`/registration/${evt.id}/drop-players`)
			.send({ registrationId: reg.id, slotIds: [reg.slotIds[1]] })

		expect(res.status).toBe(403)
		expect(await slot(reg.slotIds[1])).toMatchObject({ playerId: partner.playerId })
	})

	// ADR 0003: the staff flag no longer grants admin rights. drop-players still
	// treats isStaff as admin, so a staff user outside the group can drop players.
	// Remove `.failing` once the handler uses hasAdminRole.
	it.failing("forbids a staff user without an admin role who is not in the group", async () => {
		const evt = await createEvent()
		const [owner, partner] = [await createUser(), await createUser()]
		const staff = await createUser({ staff: true })
		const reg = await createRegistration(evt.id, [owner, partner])

		const res = await t
			.http(staff)
			.post(`/registration/${evt.id}/drop-players`)
			.send({ registrationId: reg.id, slotIds: [reg.slotIds[1]] })

		expect(res.status).toBe(403)
	})
})
