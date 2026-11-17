import { eq } from "drizzle-orm"

import {
	adminAuditEntry,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, openConnection, resetDb, testDb } from "./support/db"
import { createEvent, createRegistration, createUser, TestUser } from "./support/factories"

interface ChangeEvent {
	eventId: number
	changes: { kind: string; sessionName?: string }[]
	refused: string | null
}

const OPENED = "2020-01-01 14:00:00.000000"

async function createFeeType(name: string) {
	const [row] = await testDb()
		.insert(feeType)
		.values({ name, code: name.slice(0, 3).toUpperCase(), payout: "Passthru", restriction: "None" })
	return row.insertId
}

async function addFee(
	eventId: number,
	feeTypeId: number,
	amount: string,
	overrideAmount: string | null = null,
) {
	const [row] = await testDb()
		.insert(eventFee)
		.values({
			eventId,
			feeTypeId,
			amount,
			isRequired: 0,
			displayOrder: 9,
			overrideAmount,
			overrideRestriction: overrideAmount ? "Seniors" : null,
		})
	return row.insertId
}

async function addSessionFee(eventId: number, eventFeeId: number, amount: string) {
	const [session] = await testDb()
		.insert(eventSession)
		.values({ eventId, name: "Afternoon Swing", registrationLimit: 40, displayOrder: 1 })
	const [row] = await testDb()
		.insert(eventSessionFee)
		.values({ sessionId: session.insertId, eventFeeId, amount })
	return row.insertId
}

const feeRow = async (id: number) =>
	(await testDb().select().from(eventFee).where(eq(eventFee.id, id)))[0]
const sessionFeeRow = async (id: number) =>
	(await testDb().select().from(eventSessionFee).where(eq(eventSessionFee.id, id)))[0]

describe("season fee change", () => {
	let t: TestApp
	let eventAdmin: TestUser
	let cart: number

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		eventAdmin = await createUser({ roles: ["event-admin"] })
		cart = await createFeeType("Cart Fee")
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const change = (overrides: Record<string, unknown> = {}) => ({
		season: 2027,
		feeTypeId: cart,
		fromAmount: 14,
		toAmount: 15,
		...overrides,
	})
	const preview = (body: object) =>
		t.http(eventAdmin).post("/seasons/fee-change/preview").send(body)
	const apply = (body: object) => t.http(eventAdmin).post("/seasons/fee-change").send(body)

	it("refuses a Club Admin", async () => {
		const clubAdmin = await createUser({ roles: ["club-admin"] })
		const res = await t.http(clubAdmin).post("/seasons/fee-change/preview").send(change())
		expect(res.status).toBe(403)
	})

	describe("preview", () => {
		it("lists every amount of the fee type equal to the old amount, and writes nothing", async () => {
			const weeknight = await createEvent({ startDate: "2027-05-05" })
			const weeknightFee = await addFee(weeknight.id, cart, "14.00")
			const senior = await createEvent({ startDate: "2027-05-12" })
			await addFee(senior.id, cart, "24.00", "14.00")
			const swing = await createEvent({ startDate: "2027-05-15" })
			await addSessionFee(swing.id, await addFee(swing.id, cart, "48.00"), "14.00")
			await addFee((await createEvent({ startDate: "2027-05-19" })).id, cart, "24.00")
			await addFee((await createEvent({ season: 2026, startDate: "2026-05-06" })).id, cart, "14.00")

			const res = await preview(change())

			expect(res.status).toBe(200)
			expect(res.body).toMatchObject({ feeTypeName: "Cart Fee", applied: false, eventType: null })
			expect((res.body as { events: ChangeEvent[] }).events).toEqual([
				expect.objectContaining({
					eventId: weeknight.id,
					changes: [{ kind: "amount", eventFeeId: weeknightFee }],
					refused: null,
				}),
				expect.objectContaining({
					eventId: senior.id,
					changes: [expect.objectContaining({ kind: "override" })],
				}),
				expect.objectContaining({
					eventId: swing.id,
					changes: [expect.objectContaining({ kind: "session", sessionName: "Afternoon Swing" })],
				}),
			])
			expect((await feeRow(weeknightFee)).amount).toBe("14.00")
		})

		it("limits the change to one event type", async () => {
			const weeknight = await createEvent({ eventType: "N" })
			await addFee(weeknight.id, cart, "14.00")
			await addFee((await createEvent({ eventType: "W", name: "Major" })).id, cart, "14.00")

			const res = await preview(change({ eventType: "N" }))

			expect((res.body as { events: ChangeEvent[] }).events.map((e) => e.eventId)).toEqual([
				weeknight.id,
			])
		})

		it.each([
			["the same old and new amount", { toAmount: 14 }],
			["an unknown fee type", { feeTypeId: 99999 }],
			["fractions of a cent", { toAmount: 15.001 }],
		])("refuses %s", async (_label, overrides) => {
			const res = await preview(change(overrides))
			expect(res.status).toBe(400)
		})
	})

	describe("apply", () => {
		it("changes amounts, overrides, and session fees, auditing each event fee", async () => {
			const weeknight = await createEvent({ startDate: "2027-05-05" })
			const weeknightFee = await addFee(weeknight.id, cart, "14.00", "14.00")
			const swing = await createEvent({ startDate: "2027-05-15" })
			const swingFee = await addFee(swing.id, cart, "48.00")
			const sessionFee = await addSessionFee(swing.id, swingFee, "14.00")

			const res = await apply(change())

			expect(res.status).toBe(200)
			expect(res.body).toMatchObject({ applied: true })
			expect(await feeRow(weeknightFee)).toMatchObject({ amount: "15.00", overrideAmount: "15.00" })
			expect((await feeRow(swingFee)).amount).toBe("48.00")
			expect((await sessionFeeRow(sessionFee)).amount).toBe("15.00")

			const entries = await testDb().select().from(adminAuditEntry).orderBy(adminAuditEntry.id)
			expect(entries).toEqual([
				expect.objectContaining({
					operation: "event.fee.season-change",
					entityType: "event_fee",
					entityId: weeknightFee,
					eventId: weeknight.id,
					changes: {
						amount: { before: 14, after: 15 },
						overrideAmount: { before: 14, after: 15 },
					},
				}),
				expect.objectContaining({
					entityId: swingFee,
					eventId: swing.id,
					changes: {
						sessionFees: { before: { "Afternoon Swing": 14 }, after: { "Afternoon Swing": 15 } },
					},
				}),
			])
		})

		/**
		 * Another admin's transaction holds the event and changes its session fee from $14 to
		 * $20. The fee change waits for that commit and must then see $20, not an earlier read.
		 */
		it("does not overwrite a session fee another admin changed while it waited", async () => {
			const swing = await createEvent({ startDate: "2027-05-15" })
			const sessionFee = await addSessionFee(
				swing.id,
				await addFee(swing.id, cart, "48.00"),
				"14.00",
			)

			const other = await openConnection()
			try {
				await other.beginTransaction()
				await other.query(`SELECT id FROM events_event WHERE id = ${swing.id} FOR UPDATE`)
				await other.query(
					`UPDATE events_eventsessionfee SET amount = '20.00' WHERE id = ${sessionFee}`,
				)
				const pending = apply(change()).then((res) => res) // .then() sends the request now
				// Give the request time to reach the database and block on the lock.
				await new Promise((r) => setTimeout(r, 300))
				await other.commit()
				const res = await pending
				expect(res.status).toBe(200)
				expect((res.body as { events: ChangeEvent[] }).events).toEqual([])
			} finally {
				await other.end()
			}

			expect((await sessionFeeRow(sessionFee)).amount).toBe("20.00")
			expect(await testDb().select().from(adminAuditEntry)).toHaveLength(0)
		})

		it("refuses an event that another admin registered a player for while it waited", async () => {
			const evt = await createEvent({ startDate: "2027-05-05" })
			const fee = await addFee(evt.id, cart, "14.00")
			const user = await createUser()

			const other = await openConnection()
			try {
				await other.beginTransaction()
				await other.query(`SELECT id FROM events_event WHERE id = ${evt.id} FOR UPDATE`)
				await other.query(
					`INSERT INTO register_registration (event_id, user_id, signed_up_by, created_date) VALUES (${evt.id}, ${user.id}, 'Someone', NOW())`,
				)
				const pending = apply(change()).then((res) => res) // .then() sends the request now
				await new Promise((r) => setTimeout(r, 300))
				await other.commit()
				const res = await pending
				expect((res.body as { events: ChangeEvent[] }).events[0].refused).toBe("Has 1 registration")
			} finally {
				await other.end()
			}

			expect((await feeRow(fee)).amount).toBe("14.00")
		})

		it("leaves events with registrations, or whose registration has opened, unchanged", async () => {
			const open = await createEvent({ startDate: "2027-05-05" })
			const openFee = await addFee(open.id, cart, "14.00")
			const registered = await createEvent({ startDate: "2027-05-12" })
			const registeredFee = await addFee(registered.id, cart, "14.00")
			await createRegistration(registered.id, [await createUser()])
			const opened = await createEvent({ startDate: "2027-05-19", prioritySignupStart: OPENED })
			const openedFee = await addFee(opened.id, cart, "14.00")

			const res = await apply(change())

			const events = (res.body as { events: ChangeEvent[] }).events
			expect(events.map((e) => [e.eventId, e.refused])).toEqual([
				[open.id, null],
				[registered.id, "Has 1 registration"],
				[opened.id, "Registration has opened"],
			])
			expect((await feeRow(openFee)).amount).toBe("15.00")
			expect((await feeRow(registeredFee)).amount).toBe("14.00")
			expect((await feeRow(openedFee)).amount).toBe("14.00")
			expect(await testDb().select().from(adminAuditEntry)).toHaveLength(1)
		})
	})
})
