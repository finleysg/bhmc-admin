import { eq } from "drizzle-orm"

import {
	adminAuditEntry,
	course,
	event,
	eventCourses,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	hole,
	payment,
	registrationFee,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

/** A valid weeknight event where players choose tee times, as the workspace sends it. */
function settings(overrides: Record<string, unknown> = {}) {
	return {
		eventType: "N",
		name: "Weeknight Stroke",
		rounds: null,
		registrationType: "M",
		skinsType: "I",
		minimumSignupGroupSize: 1,
		maximumSignupGroupSize: 5,
		groupSize: 5,
		totalGroups: 15,
		startType: "TT",
		canChoose: true,
		ghinRequired: true,
		seasonPoints: 30,
		notes: null,
		startDate: "2027-05-05",
		startTime: "3:00 PM",
		prioritySignupStart: "2027-04-26T14:00:00.000Z",
		signupStart: "2027-04-28T14:00:00.000Z",
		signupEnd: "2027-05-04T17:00:00.000Z",
		paymentsEnd: "2027-05-04T22:00:00.000Z",
		registrationMaximum: null,
		portalUrl: null,
		externalUrl: null,
		status: "S",
		season: 2027,
		teeTimeSplits: "8",
		starterTimeInterval: 0,
		teamSize: 1,
		signupWaves: null,
		ageRestriction: null,
		ageRestrictionType: "N",
		...overrides,
	}
}

const auditEntries = () => testDb().select().from(adminAuditEntry)

async function createFeeType(name: string) {
	const [row] = await testDb()
		.insert(feeType)
		.values({ name, code: name.slice(0, 3).toUpperCase(), payout: "Passthru", restriction: "None" })
	return row.insertId
}

async function createCourse(name: string) {
	const [row] = await testDb().insert(course).values({ name, numberOfHoles: 9 })
	return row.insertId
}

describe("event workspace", () => {
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

	describe("permissions", () => {
		it("refuses a Club Admin", async () => {
			const clubAdmin = await createUser({ roles: ["club-admin"] })
			const res = await t.http(clubAdmin).post("/events").send(settings())
			expect(res.status).toBe(403)
		})
	})

	describe("creating an event", () => {
		it("creates the event and audits every setting", async () => {
			const res = await t.http(eventAdmin).post("/events").send(settings())

			expect(res.status).toBe(201)
			const body = res.body as { id: number; name: string; signupStart: string; courses: unknown[] }
			expect(body).toMatchObject({
				name: "Weeknight Stroke",
				signupStart: "2027-04-28T14:00:00.000Z",
				canChoose: true,
				courses: [],
				eventFees: [],
				sessions: [],
			})
			const [row] = await testDb().select().from(event).where(eq(event.id, body.id))
			expect(row).toMatchObject({ canChoose: 1, signupStart: "2027-04-28 14:00:00.000000" })

			const [entry] = await auditEntries()
			expect(entry).toMatchObject({
				actorId: eventAdmin.id,
				operation: "event.create",
				entityType: "event",
				entityId: body.id,
				eventId: body.id,
			})
			expect(entry.changes).toMatchObject({ name: { before: null, after: "Weeknight Stroke" } })
		})

		it.each([
			["no group size when players choose", { groupSize: null }, "groupSize"],
			["no groups per course for chosen tee times", { totalGroups: 0 }, "totalGroups"],
			["no signup group sizes", { minimumSignupGroupSize: null }, "minimumSignupGroupSize"],
			["no signup window", { signupEnd: null }, "signupStart"],
			["signup start after signup end", { signupStart: "2027-05-05T14:00:00.000Z" }, "signupEnd"],
			["an unknown event type", { eventType: "X" }, "eventType"],
			["a datetime with no offset", { signupStart: "2027-04-28 09:00" }, "signupStart"],
		])("rejects %s", async (_, overrides, field) => {
			const res = await t.http(eventAdmin).post("/events").send(settings(overrides))

			expect(res.status).toBe(400)
			expect((res.body as { message: string[] }).message.join("\n")).toContain(field)
			expect(await testDb().select().from(event)).toEqual([])
		})

		it("refuses a name already used on the same date", async () => {
			await t.http(eventAdmin).post("/events").send(settings())
			const res = await t.http(eventAdmin).post("/events").send(settings())
			expect(res.status).toBe(409)
		})
	})

	describe("editing settings", () => {
		it("saves the settings and audits only what changed", async () => {
			const created = (await t.http(eventAdmin).post("/events").send(settings())).body as {
				id: number
			}

			const res = await t
				.http(eventAdmin)
				.put(`/events/${created.id}`)
				.send(settings({ startTime: "3:30 PM", groupSize: 4 }))

			expect(res.status).toBe(200)
			expect(res.body).toMatchObject({ startTime: "3:30 PM", groupSize: 4 })
			const entries = await auditEntries()
			expect(entries[1]).toMatchObject({
				operation: "event.update",
				changes: {
					startTime: { before: "3:00 PM", after: "3:30 PM" },
					groupSize: { before: 5, after: 4 },
				},
			})
		})

		it("does not audit saving unchanged settings", async () => {
			const created = (await t.http(eventAdmin).post("/events").send(settings())).body as {
				id: number
			}
			await t.http(eventAdmin).put(`/events/${created.id}`).send(settings())
			expect(await auditEntries()).toHaveLength(1)
		})

		it("returns 404 for an unknown event", async () => {
			const res = await t.http(eventAdmin).put("/events/9999").send(settings())
			expect(res.status).toBe(404)
		})
	})

	describe("courses", () => {
		it("replaces the event's courses and audits the change", async () => {
			const evt = await createEvent()
			const other = await createCourse("North")

			const res = await t
				.http(eventAdmin)
				.put(`/events/${evt.id}/courses`)
				.send({ courseIds: [other] })

			expect(res.status).toBe(200)
			expect((res.body as { courses: { id: number }[] }).courses.map((c) => c.id)).toEqual([other])
			const [entry] = await auditEntries()
			expect(entry).toMatchObject({
				operation: "event.courses.update",
				changes: { courseIds: { before: [evt.courseId], after: [other] } },
			})
		})

		it("refuses to remove a course that has slots for the event", async () => {
			const evt = await createEvent()
			const [holeRow] = await testDb().select().from(hole).where(eq(hole.courseId, evt.courseId))
			await testDb()
				.insert(registrationSlot)
				.values({ eventId: evt.id, holeId: holeRow.id, status: "A", startingOrder: 0, slot: 0 })

			const res = await t.http(eventAdmin).put(`/events/${evt.id}/courses`).send({ courseIds: [] })

			expect(res.status).toBe(409)
			expect(await testDb().select().from(eventCourses)).toHaveLength(1)
		})

		it("rejects an unknown course", async () => {
			const evt = await createEvent()
			const res = await t
				.http(eventAdmin)
				.put(`/events/${evt.id}/courses`)
				.send({ courseIds: [9999] })
			expect(res.status).toBe(400)
		})
	})

	describe("event fees", () => {
		it("adds a fee after the existing ones and audits it", async () => {
			const evt = await createEvent()
			const cart = await createFeeType("Cart")

			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/fees`)
				.send({ feeTypeId: cart, amount: 14, isRequired: false })

			expect(res.status).toBe(201)
			expect(res.body).toMatchObject({
				amount: 14,
				displayOrder: 2,
				feeType: { name: "Cart" },
			})
			const [entry] = await auditEntries()
			expect(entry).toMatchObject({
				operation: "event.fee.create",
				entityType: "event_fee",
				eventId: evt.id,
				changes: { amount: { before: null, after: 14 } },
			})
		})

		it("refuses a second fee of the same type", async () => {
			const evt = await createEvent()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, evt.id))

			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/fees`)
				.send({ feeTypeId: fee.feeTypeId, amount: 5, isRequired: false })

			expect(res.status).toBe(409)
		})

		it("rejects an override with no restriction", async () => {
			const evt = await createEvent()
			const cart = await createFeeType("Cart")
			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/fees`)
				.send({ feeTypeId: cart, amount: 14, isRequired: false, overrideAmount: 7 })
			expect(res.status).toBe(400)
		})

		it("updates a fee and audits the change", async () => {
			const evt = await createEvent()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, evt.id))

			const res = await t.http(eventAdmin).put(`/events/${evt.id}/fees/${fee.id}`).send({
				feeTypeId: fee.feeTypeId,
				amount: 16,
				isRequired: true,
				overrideAmount: 8,
				overrideRestriction: "Seniors",
			})

			expect(res.status).toBe(200)
			expect(res.body).toMatchObject({ amount: 16, overrideAmount: 8, displayOrder: 1 })
			const [entry] = await auditEntries()
			expect(entry.changes).toEqual({
				amount: { before: 15, after: 16 },
				overrideAmount: { before: null, after: 8 },
				overrideRestriction: { before: null, after: "Seniors" },
			})
		})

		it("returns 404 for a fee on another event", async () => {
			const evt = await createEvent()
			const other = await createEvent()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, other.id))
			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/fees/${fee.id}`)
			expect(res.status).toBe(404)
		})

		it("deletes an unused fee and audits it", async () => {
			const evt = await createEvent()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, evt.id))

			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/fees/${fee.id}`)

			expect(res.status).toBe(204)
			expect(await testDb().select().from(eventFee)).toEqual([])
			expect((await auditEntries())[0]).toMatchObject({
				operation: "event.fee.delete",
				entityId: fee.id,
			})
		})

		it("refuses to delete a fee a registration was charged", async () => {
			const evt = await createEvent()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, evt.id))
			const [paymentRow] = await testDb().insert(payment).values({
				paymentCode: "pi_test",
				paymentKey: null,
				notificationType: "R",
				confirmed: 1,
				eventId: evt.id,
				userId: eventAdmin.id,
				paymentAmount: "15.00",
				transactionFee: "0.00",
				paymentDate: "2027-04-28 14:00:00",
				confirmDate: "2027-04-28 14:00:00",
			})
			await testDb()
				.insert(registrationFee)
				.values({ eventFeeId: fee.id, paymentId: paymentRow.insertId, isPaid: 1, amount: "15.00" })

			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/fees/${fee.id}`)

			expect(res.status).toBe(409)
			expect(await testDb().select().from(eventFee)).toHaveLength(1)
		})
	})

	describe("copying an event", () => {
		it("copies settings, courses, fees, sessions, and session fees to the new date", async () => {
			const evt = await createEvent({
				name: "Spring Scramble",
				startDate: "2027-03-03",
				registrationType: "M",
				// 9:00 AM Central (CST) on 2027-02-24
				signupStart: "2027-02-24 15:00:00.000000",
				signupEnd: "2027-03-02 23:00:00.000000",
				ggId: "gg-123",
				portalUrl: "https://portal",
				status: "C",
			})
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, evt.id))
			const [sessionRow] = await testDb()
				.insert(eventSession)
				.values({ eventId: evt.id, name: "Early", registrationLimit: 40, displayOrder: 1 })
			await testDb()
				.insert(eventSessionFee)
				.values({ sessionId: sessionRow.insertId, eventFeeId: fee.id, amount: "12.00" })

			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/copy`)
				.send({ startDate: "2027-04-07" })

			expect(res.status).toBe(201)
			const copy = res.body as {
				id: number
				courses: { id: number }[]
				eventFees: { id: number; amount: number }[]
				sessions: { name: string; feeOverrides: { eventFeeId: number; amount: number }[] }[]
			}
			expect(copy).toMatchObject({
				name: "Spring Scramble",
				startDate: "2027-04-07",
				season: 2027,
				status: "S",
				ggId: null,
				portalUrl: null,
				// still 9:00 AM Central, now CDT
				signupStart: "2027-03-31T14:00:00.000Z",
			})
			expect(copy.courses.map((c) => c.id)).toEqual([evt.courseId])
			expect(copy.eventFees).toEqual([expect.objectContaining({ amount: 15 })])
			expect(copy.eventFees[0].id).not.toBe(fee.id)
			expect(copy.sessions).toEqual([
				expect.objectContaining({
					name: "Early",
					feeOverrides: [expect.objectContaining({ eventFeeId: copy.eventFees[0].id, amount: 12 })],
				}),
			])
			expect((await auditEntries())[0]).toMatchObject({
				operation: "event.copy",
				entityId: copy.id,
				changes: { copiedFromEventId: { before: null, after: evt.id } },
			})
		})

		it("refuses a copy whose name already exists on that date and leaves nothing behind", async () => {
			const evt = await createEvent({ name: "Opener", startDate: "2027-04-07" })

			const res = await t
				.http(eventAdmin)
				.post(`/events/${evt.id}/copy`)
				.send({ startDate: "2027-04-07" })

			expect(res.status).toBe(409)
			expect(await testDb().select().from(event)).toHaveLength(1)
		})
	})

	describe("lookups", () => {
		it("lists fee types and courses", async () => {
			await createFeeType("Cart")
			await createCourse("North")

			const feeTypes = await t.http(eventAdmin).get("/fee-types")
			const courses = await t.http(eventAdmin).get("/courses")

			expect(feeTypes.body).toEqual([expect.objectContaining({ name: "Cart" })])
			expect(courses.body).toEqual([expect.objectContaining({ name: "North" })])
		})
	})
})
