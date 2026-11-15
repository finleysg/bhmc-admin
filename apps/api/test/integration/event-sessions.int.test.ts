import { eq } from "drizzle-orm"

import {
	adminAuditEntry,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

const auditEntries = () => testDb().select().from(adminAuditEntry)
const sessionFees = () => testDb().select().from(eventSessionFee)

describe("event sessions", () => {
	let t: TestApp
	let eventAdmin: TestUser
	let eventId: number
	let feeId: number
	let cartFeeId: number

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		eventAdmin = await createUser({ roles: ["event-admin"] })
		const evt = await createEvent({ canChoose: 0 })
		eventId = evt.id
		;[{ id: feeId }] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, eventId))
		const [cartType] = await testDb()
			.insert(feeType)
			.values({ name: "Cart", code: "CRT", payout: "Passthru", restriction: "None" })
		const [cart] = await testDb().insert(eventFee).values({
			eventId,
			feeTypeId: cartType.insertId,
			amount: "14.00",
			isRequired: 0,
			displayOrder: 2,
		})
		cartFeeId = cart.insertId
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const create = (body: Record<string, unknown> = {}) =>
		t
			.http(eventAdmin)
			.post(`/events/${eventId}/sessions`)
			.send({
				name: "Early",
				registrationLimit: 40,
				displayOrder: 1,
				feeOverrides: [{ eventFeeId: feeId, amount: 12 }],
				...body,
			})

	it("creates a session with its fee overrides and audits it", async () => {
		const res = await create()

		expect(res.status).toBe(201)
		const session = res.body as { id: number }
		expect(res.body).toMatchObject({
			name: "Early",
			registrationLimit: 40,
			feeOverrides: [{ eventFeeId: feeId, amount: 12 }],
		})
		expect((await auditEntries())[0]).toMatchObject({
			operation: "event.session.create",
			entityType: "event_session",
			entityId: session.id,
			eventId,
			changes: {
				name: { before: null, after: "Early" },
				feeOverrides: { before: null, after: [{ eventFeeId: feeId, amount: 12 }] },
			},
		})
	})

	it("updates overrides in place: keeps unchanged rows, adds new, removes dropped", async () => {
		const session = (await create()).body as { id: number }
		const [original] = await sessionFees()

		const res = await t
			.http(eventAdmin)
			.put(`/events/${eventId}/sessions/${session.id}`)
			.send({
				name: "Early",
				registrationLimit: 36,
				displayOrder: 1,
				feeOverrides: [
					{ eventFeeId: feeId, amount: 12 },
					{ eventFeeId: cartFeeId, amount: 10 },
				],
			})

		expect(res.status).toBe(200)
		const rows = await sessionFees()
		expect(rows).toHaveLength(2)
		expect(rows.find((r) => r.eventFeeId === feeId)!.id).toBe(original.id)
		const entries = await auditEntries()
		expect(entries[1]).toMatchObject({
			operation: "event.session.update",
			changes: {
				registrationLimit: { before: 40, after: 36 },
				feeOverrides: {
					before: [{ eventFeeId: feeId, amount: 12 }],
					after: [
						{ eventFeeId: feeId, amount: 12 },
						{ eventFeeId: cartFeeId, amount: 10 },
					],
				},
			},
		})

		await t
			.http(eventAdmin)
			.put(`/events/${eventId}/sessions/${session.id}`)
			.send({ name: "Early", registrationLimit: 36, displayOrder: 1, feeOverrides: [] })
		expect(await sessionFees()).toEqual([])
	})

	it("does not audit saving an unchanged session", async () => {
		const session = (await create()).body as { id: number }
		await t
			.http(eventAdmin)
			.put(`/events/${eventId}/sessions/${session.id}`)
			.send({
				name: "Early",
				registrationLimit: 40,
				displayOrder: 1,
				feeOverrides: [{ eventFeeId: feeId, amount: 12 }],
			})
		expect(await auditEntries()).toHaveLength(1)
	})

	it("refuses a duplicate name or display order", async () => {
		await create()
		expect((await create({ displayOrder: 2 })).status).toBe(409)
		expect((await create({ name: "Late" })).status).toBe(409)
	})

	it("rejects a fee override for another event's fee", async () => {
		const other = await createEvent()
		const [otherFee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, other.id))

		const res = await create({ feeOverrides: [{ eventFeeId: otherFee.id, amount: 5 }] })

		expect(res.status).toBe(400)
		expect(await testDb().select().from(eventSession)).toEqual([])
	})

	it("rejects an incomplete body", async () => {
		const res = await t.http(eventAdmin).post(`/events/${eventId}/sessions`).send({ name: "Early" })
		expect(res.status).toBe(400)
	})

	it("returns 404 for a session on another event", async () => {
		const session = (await create()).body as { id: number }
		const other = await createEvent()
		const res = await t.http(eventAdmin).delete(`/events/${other.id}/sessions/${session.id}`)
		expect(res.status).toBe(404)
	})

	it("deletes a session with its overrides and audits it", async () => {
		const session = (await create()).body as { id: number }

		const res = await t.http(eventAdmin).delete(`/events/${eventId}/sessions/${session.id}`)

		expect(res.status).toBe(204)
		expect(await testDb().select().from(eventSession)).toEqual([])
		expect(await sessionFees()).toEqual([])
		expect((await auditEntries())[1]).toMatchObject({
			operation: "event.session.delete",
			entityId: session.id,
			changes: { name: { before: "Early", after: null } },
		})
	})

	it("refuses to delete a session that registration slots belong to", async () => {
		const session = (await create()).body as { id: number }
		await testDb()
			.insert(registrationSlot)
			.values({ eventId, sessionId: session.id, status: "A", startingOrder: 0, slot: 0 })

		const res = await t.http(eventAdmin).delete(`/events/${eventId}/sessions/${session.id}`)

		expect(res.status).toBe(409)
		expect(await testDb().select().from(eventSession)).toHaveLength(1)
	})
})
