import { eq } from "drizzle-orm"

import type { EventReadiness, ReadinessSummary } from "@repo/domain/types"

import {
	adminAuditEntry,
	authGroup,
	authUserGroups,
	eventCourses,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	readinessDismissal,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

const DAY_MS = 86_400_000
const mysql = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ")

async function createFeeType(name: string) {
	const [row] = await testDb()
		.insert(feeType)
		.values({ name, code: name.slice(0, 3).toUpperCase(), payout: "Passthru", restriction: "None" })
	return row.insertId
}

async function addFee(eventId: number, feeTypeId: number, amount: string) {
	const [row] = await testDb()
		.insert(eventFee)
		.values({ eventId, feeTypeId, amount, isRequired: 1, displayOrder: 2 })
	return row.insertId
}

async function addSlot(eventId: number) {
	await testDb()
		.insert(registrationSlot)
		.values({ eventId, status: "A", startingOrder: 0, slot: 0 })
}

/** A weeknight where players choose tee times, with a course, a fee, and a slot: nothing to report. */
async function readyEvent(overrides: Parameters<typeof createEvent>[0] = {}) {
	const evt = await createEvent(overrides)
	await addSlot(evt.id)
	return evt
}

describe("readiness", () => {
	let t: TestApp
	let eventAdmin: TestUser

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		eventAdmin = await createUser({ roles: ["event-admin"] })
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const readiness = async (eventId: number) => {
		const res = await t.http(eventAdmin).get(`/events/${eventId}/readiness`)
		expect(res.status).toBe(200)
		return res.body as EventReadiness
	}
	const codes = async (eventId: number) =>
		(await readiness(eventId)).findings.map((f) => `${f.code}:${f.subject}`)

	it("refuses a Club Admin", async () => {
		const evt = await readyEvent()
		const clubAdmin = await createUser({ roles: ["club-admin"] })
		expect((await t.http(clubAdmin).get(`/events/${evt.id}/readiness`)).status).toBe(403)
	})

	it("returns 404 for an unknown event", async () => {
		expect((await t.http(eventAdmin).get("/events/999999/readiness")).status).toBe(404)
	})

	it("is green for a well set-up event", async () => {
		const evt = await readyEvent()
		expect(await readiness(evt.id)).toEqual({
			eventId: evt.id,
			milestone: "open-registration",
			applies: true,
			level: "green",
			findings: [],
		})
	})

	describe("blocking findings", () => {
		it("reports missing slots, courses, and fees", async () => {
			const evt = await createEvent()
			await testDb().delete(eventCourses).where(eq(eventCourses.eventId, evt.id))
			await testDb().delete(eventFee).where(eq(eventFee.eventId, evt.id))

			const r = await readiness(evt.id)
			expect(r.level).toBe("red")
			expect(r.findings.map((f) => f.code)).toEqual(["no-slots", "courses-missing", "fees-missing"])
		})

		it("reports a tee-sheet start time saved before the rule existed", async () => {
			const evt = await readyEvent({ startTime: "Afternoon" })
			expect(await codes(evt.id)).toEqual(["start-time-invalid:"])
		})

		it("reports a canceled event", async () => {
			const evt = await readyEvent({ status: "C" })
			expect(await codes(evt.id)).toEqual(["event-canceled:"])
		})

		it("reports dates out of order saved before the rule existed", async () => {
			const evt = await readyEvent({
				signupStart: "2027-04-28 14:00:00",
				signupEnd: "2027-04-27 14:00:00",
			})
			expect(await codes(evt.id)).toEqual(["dates-out-of-order:signupEnd"])
		})

		it("cannot be dismissed", async () => {
			const evt = await createEvent()
			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/readiness/dismissals`)
				.send({ code: "no-slots" })
			expect(res.status).toBe(400)
		})
	})

	describe("session warnings", () => {
		/** Last season's event: two sessions, the second overriding a fee. */
		async function lastSeason(afternoonName: string) {
			const last = await createEvent({
				name: "2 Man Scramble",
				season: 2026,
				startDate: "2026-04-25",
			})
			await testDb()
				.insert(eventSession)
				.values({ eventId: last.id, name: "Morning Swing", registrationLimit: 40, displayOrder: 1 })
			const [afternoon] = await testDb()
				.insert(eventSession)
				.values({ eventId: last.id, name: afternoonName, registrationLimit: 40, displayOrder: 2 })
			const [lastFee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, last.id))
			await testDb()
				.insert(eventSessionFee)
				.values({ sessionId: afternoon.insertId, eventFeeId: lastFee.id, amount: "20.00" })
		}

		const thisSeason = () =>
			createEvent({
				name: "2 Man Scramble",
				startDate: "2027-04-24",
				canChoose: 0,
				startType: "NA",
			})

		async function addSessions(eventId: number, afternoonName: string) {
			await testDb()
				.insert(eventSession)
				.values([
					{ eventId, name: "Morning Swing", registrationLimit: 40, displayOrder: 1 },
					{ eventId, name: afternoonName, registrationLimit: 40, displayOrder: 2 },
				])
		}

		it("warns about sessions or fee overrides the event had last season", async () => {
			await lastSeason("Afternoon Swing")
			const evt = await thisSeason()
			expect(await readiness(evt.id)).toMatchObject({
				level: "yellow",
				findings: [{ code: "sessions-missing", subject: "", severity: "warning" }],
			})

			await addSessions(evt.id, "Afternoon Swing")
			expect(await codes(evt.id)).toEqual(["sessions-missing:Afternoon Swing"])
		})

		it("dismisses a session warning, even for a long session name", async () => {
			const name = "Afternoon Swing for Seniors Playing the Forward Tees" // 51 characters
			await lastSeason(name)
			const evt = await thisSeason()
			await addSessions(evt.id, name)

			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/readiness/dismissals`)
				.send({ code: "sessions-missing", subject: name })

			expect(res.status).toBe(201)
			expect(res.body).toMatchObject({
				level: "green",
				findings: [{ code: "sessions-missing", subject: name, dismissed: true }],
			})
		})
	})

	describe("when it applies", () => {
		it("stops applying once registration opens", async () => {
			const opened = mysql(new Date(Date.now() - DAY_MS))
			const evt = await createEvent({ signupStart: opened, signupEnd: "2027-05-04 17:00:00" })
			expect(await readiness(evt.id)).toMatchObject({ applies: false, findings: [] })
		})

		it("uses the priority signup start when there is one", async () => {
			const evt = await createEvent({
				prioritySignupStart: mysql(new Date(Date.now() - DAY_MS)),
				signupStart: "2027-04-28 14:00:00",
				signupEnd: "2027-05-04 17:00:00",
			})
			expect((await readiness(evt.id)).applies).toBe(false)
		})

		it("does not apply to an event without registration", async () => {
			const evt = await createEvent({ registrationType: "N" })
			expect((await readiness(evt.id)).applies).toBe(false)
		})
	})

	describe("warnings", () => {
		let cart: number
		let evtId: number

		beforeEach(async () => {
			cart = await createFeeType("Cart Fee")
			for (const startDate of ["2027-05-12", "2027-05-19", "2027-05-26"]) {
				const peer = await readyEvent({ startDate, startTime: "3:00 PM" })
				await addFee(peer.id, cart, "15.00")
			}
			const evt = await readyEvent({ startTime: "3:00 PM" })
			await addFee(evt.id, cart, "14.00")
			evtId = evt.id
		})

		it("reports a fee that differs from most events of the type", async () => {
			const r = await readiness(evtId)
			expect(r.level).toBe("yellow")
			expect(r.findings).toEqual([
				expect.objectContaining({
					code: "fee-differs",
					subject: String(cart),
					severity: "warning",
					dismissed: false,
				}),
			])
		})

		it("dismisses and restores a warning, auditing both", async () => {
			const dismissed = await t
				.http(eventAdmin)
				.post(`/events/${evtId}/readiness/dismissals`)
				.send({ code: "fee-differs", subject: String(cart) })
			expect(dismissed.status).toBe(201)
			expect(dismissed.body).toMatchObject({
				level: "green",
				findings: [{ code: "fee-differs", dismissed: true }],
			})

			// Dismissing again changes nothing.
			await t
				.http(eventAdmin)
				.post(`/events/${evtId}/readiness/dismissals`)
				.send({ code: "fee-differs", subject: String(cart) })
			expect(await testDb().select().from(readinessDismissal)).toHaveLength(1)

			const restored = await t
				.http(eventAdmin)
				.delete(`/events/${evtId}/readiness/dismissals`)
				.query({ code: "fee-differs", subject: String(cart) })
			expect(restored.status).toBe(200)
			expect(restored.body).toMatchObject({ level: "yellow" })
			expect(await testDb().select().from(readinessDismissal)).toEqual([])

			const entries = await testDb().select().from(adminAuditEntry)
			expect(entries.map((e) => [e.operation, e.eventId, e.actorId])).toEqual([
				["readiness.dismiss", evtId, eventAdmin.id],
				["readiness.restore", evtId, eventAdmin.id],
			])
			expect(entries[0].changes).toEqual({
				code: { before: null, after: "fee-differs" },
				subject: { before: null, after: String(cart) },
			})
		})

		it("refuses to dismiss a warning the event does not have", async () => {
			const res = await t
				.http(eventAdmin)
				.post(`/events/${evtId}/readiness/dismissals`)
				.send({ code: "schedule-differs", subject: "startTime" })
			expect(res.status).toBe(400)
		})

		it("returns 404 restoring a warning that is not dismissed", async () => {
			const res = await t
				.http(eventAdmin)
				.delete(`/events/${evtId}/readiness/dismissals`)
				.query({ code: "fee-differs", subject: String(cart) })
			expect(res.status).toBe(404)
		})
	})

	describe("season summary", () => {
		it("summarizes every event of the season", async () => {
			const ready = await readyEvent()
			const noSlots = await createEvent()
			const other = await readyEvent({ season: 2028, startDate: "2028-05-03" })

			const res = await t.http(eventAdmin).get("/readiness").query({ season: 2027 })

			expect(res.status).toBe(200)
			const rows = res.body as ReadinessSummary[]
			expect(rows).toHaveLength(2)
			expect(rows).toEqual(
				expect.arrayContaining([
					{ eventId: ready.id, applies: true, level: "green", blocking: 0, warnings: 0 },
					{ eventId: noSlots.id, applies: true, level: "red", blocking: 1, warnings: 0 },
				]),
			)
			expect(rows.map((r) => r.eventId)).not.toContain(other.id)
		})

		it("requires a season", async () => {
			expect((await t.http(eventAdmin).get("/readiness")).status).toBe(400)
		})
	})

	describe("daily alert", () => {
		it("previews findings for events whose registration opens within the lead time", async () => {
			const soon = new Date(Date.now() + 3 * DAY_MS)
			const later = new Date(Date.now() + 30 * DAY_MS)
			const startDate = (d: Date) => new Date(d.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)
			const due = await createEvent({
				name: "Opens Soon",
				season: soon.getFullYear(),
				startDate: startDate(soon),
				signupStart: mysql(soon),
			})
			await createEvent({
				name: "Opens Later",
				season: later.getFullYear(),
				startDate: startDate(later),
				signupStart: mysql(later),
			})

			// Alerts go to members of the Event Admin group.
			const [group] = await testDb()
				.select()
				.from(authGroup)
				.where(eq(authGroup.name, "Event Admin"))
			await testDb().insert(authUserGroups).values({ userId: eventAdmin.id, groupId: group.id })

			const res = await t.http(eventAdmin).get("/alerts/preview")

			expect(res.status).toBe(200)
			const digests = res.body as { email: string; findings: { source: string; title: string }[] }[]
			expect(digests).toEqual([
				{
					email: eventAdmin.email,
					findings: [
						expect.objectContaining({
							source: "Ready to Open Registration",
							title: `Opens Soon (${due.startDate}): Players choose their slots, but the event has none`,
						}),
					],
				},
			])
		})
	})
})
