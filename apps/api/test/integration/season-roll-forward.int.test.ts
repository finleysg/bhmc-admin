import { eq, inArray } from "drizzle-orm"

import {
	adminAuditEntry,
	event,
	eventCourses,
	eventFee,
	eventSession,
	eventSessionFee,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

interface Proposal {
	sourceEventId: number
	name: string
	startDate: string
	sourceStatus: string
	createsSlots: boolean
	issues: string[]
}

interface Created {
	sourceEventId: number
	eventId: number
	name: string
	startDate: string
	slotCount: number
}

/** A Wednesday weeknight event in 2026 where players choose tee times. */
function weeknight(overrides: Parameters<typeof createEvent>[0] = {}) {
	return createEvent({
		name: "Individual LG/LN",
		season: 2026,
		startDate: "2026-05-06",
		totalGroups: 3,
		groupSize: 4,
		minimumSignupGroupSize: 1,
		maximumSignupGroupSize: 4,
		// 10:00 PM and 11:00 PM CDT on Monday May 4.
		prioritySignupStart: "2026-05-05 03:00:00.000000",
		signupStart: "2026-05-05 04:00:00.000000",
		signupEnd: "2026-05-06 17:00:00.000000",
		paymentsEnd: "2026-05-06 17:00:00.000000",
		ggId: "GG-123",
		portalUrl: "https://example.com/portal",
		externalUrl: "https://example.com/external",
		...overrides,
	})
}

const eventsOf = (season: number) =>
	testDb().select().from(event).where(eq(event.season, season)).orderBy(event.startDate)

describe("season roll-forward", () => {
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

	const preview = (body: object) =>
		t.http(eventAdmin).post("/seasons/roll-forward/preview").send(body)
	const apply = (body: object) => t.http(eventAdmin).post("/seasons/roll-forward").send(body)

	it("refuses a Club Admin", async () => {
		const clubAdmin = await createUser({ roles: ["club-admin"] })
		const res = await t
			.http(clubAdmin)
			.post("/seasons/roll-forward/preview")
			.send({ fromSeason: 2026, toSeason: 2027 })
		expect(res.status).toBe(403)
	})

	describe("preview", () => {
		it("proposes every source event 364 days later with the year in its name moved", async () => {
			const lgln = await weeknight()
			const registration = await createEvent({
				name: "2026 Season Registration",
				eventType: "R",
				registrationType: "O",
				canChoose: 0,
				startType: "NA",
				season: 2026,
				startDate: "2026-01-18",
				minimumSignupGroupSize: 1,
				maximumSignupGroupSize: 1,
				signupStart: "2026-01-18 21:00:00.000000",
				signupEnd: "2026-04-01 05:00:00.000000",
			})
			const rainedOut = await weeknight({
				name: "4 Man Scramble",
				startDate: "2026-06-10",
				status: "C",
			})
			await createEvent({ season: 2025, startDate: "2025-05-07" })

			const res = await preview({ fromSeason: 2026, toSeason: 2027 })

			expect(res.status).toBe(200)
			const events = (res.body as { events: Proposal[] }).events
			expect(events).toEqual([
				expect.objectContaining({
					sourceEventId: registration.id,
					name: "2027 Season Registration",
					startDate: "2027-01-17",
					createsSlots: false,
					issues: [],
				}),
				expect.objectContaining({
					sourceEventId: lgln.id,
					name: "Individual LG/LN",
					startDate: "2027-05-05",
					createsSlots: true,
					issues: [],
				}),
				expect.objectContaining({
					sourceEventId: rainedOut.id,
					startDate: "2027-06-09",
					sourceStatus: "C",
					issues: [],
				}),
			])
			expect(await eventsOf(2027)).toHaveLength(0)
		})

		it("flags an event whose name already exists on its date", async () => {
			const source = await weeknight()
			await weeknight({ season: 2027, startDate: "2027-05-05" })

			const res = await preview({ fromSeason: 2026, toSeason: 2027 })

			const proposal = (res.body as { events: Proposal[] }).events.find(
				(e) => e.sourceEventId === source.id,
			)!
			expect(proposal.issues).toEqual([
				'An event named "Individual LG/LN" already exists on 2027-05-05',
			])
		})

		it("refuses the same season as source and target", async () => {
			const res = await preview({ fromSeason: 2026, toSeason: 2026 })
			expect(res.status).toBe(400)
		})
	})

	describe("apply", () => {
		it("creates the events with their setup and slots, and resets what belongs to the old season", async () => {
			const source = await weeknight()
			const [fee] = await testDb().select().from(eventFee).where(eq(eventFee.eventId, source.id))
			const [session] = await testDb()
				.insert(eventSession)
				.values({ eventId: source.id, name: "Early", registrationLimit: 40, displayOrder: 1 })
			await testDb()
				.insert(eventSessionFee)
				.values({ sessionId: session.insertId, eventFeeId: fee.id, amount: "12.00" })

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [{ sourceEventId: source.id, name: "Individual LG/LN", startDate: "2027-05-05" }],
			})

			expect(res.status).toBe(201)
			const [created] = (res.body as { created: Created[] }).created
			expect(created).toMatchObject({
				sourceEventId: source.id,
				startDate: "2027-05-05",
				slotCount: 12,
			})

			const [row] = await eventsOf(2027)
			expect(row).toMatchObject({
				id: created.eventId,
				name: "Individual LG/LN",
				status: "S",
				ggId: null,
				portalUrl: null,
				externalUrl: null,
				totalGroups: 3,
				startTime: "3:00 PM",
				// Same club time, 364 days later.
				prioritySignupStart: "2027-05-04 03:00:00.000000",
				signupStart: "2027-05-04 04:00:00.000000",
				signupEnd: "2027-05-05 17:00:00.000000",
			})

			const courses = await testDb()
				.select()
				.from(eventCourses)
				.where(eq(eventCourses.eventId, created.eventId))
			expect(courses.map((c) => c.courseId)).toEqual([source.courseId])
			const [newFee] = await testDb()
				.select()
				.from(eventFee)
				.where(eq(eventFee.eventId, created.eventId))
			expect(newFee).toMatchObject({ feeTypeId: fee.feeTypeId, amount: "15.00" })
			const [newSession] = await testDb()
				.select()
				.from(eventSession)
				.where(eq(eventSession.eventId, created.eventId))
			expect(newSession).toMatchObject({ name: "Early", registrationLimit: 40 })
			const sessionFees = await testDb()
				.select()
				.from(eventSessionFee)
				.where(eq(eventSessionFee.sessionId, newSession.id))
			expect(sessionFees).toEqual([
				expect.objectContaining({ eventFeeId: newFee.id, amount: "12.00" }),
			])

			const slots = await testDb()
				.select()
				.from(registrationSlot)
				.where(eq(registrationSlot.eventId, created.eventId))
			expect(slots).toHaveLength(12)
			expect(slots.every((s) => s.status === "A" && s.playerId === null)).toBe(true)

			const [entry] = await testDb().select().from(adminAuditEntry)
			expect(entry).toMatchObject({
				actorId: eventAdmin.id,
				operation: "event.rollforward",
				entityId: created.eventId,
				eventId: created.eventId,
			})
			expect(entry.changes).toMatchObject({
				rolledForwardFromEventId: { before: null, after: source.id },
				slotCount: { before: null, after: 12 },
			})

			// The source event is untouched.
			const [after] = await testDb().select().from(event).where(eq(event.id, source.id))
			expect(after).toMatchObject({ season: 2026, ggId: "GG-123" })
		})

		it("keeps signup offsets from a date moved in the preview", async () => {
			const source = await weeknight()

			await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [{ sourceEventId: source.id, name: "Opener", startDate: "2027-04-28" }],
			})

			const [row] = await eventsOf(2027)
			expect(row).toMatchObject({
				name: "Opener",
				startDate: "2027-04-28",
				signupStart: "2027-04-27 04:00:00.000000",
			})
		})

		it("creates nothing when any event is refused", async () => {
			const first = await weeknight()
			const second = await weeknight({ name: "Chicago 19", startDate: "2026-06-17" })
			await weeknight({ name: "Chicago 19", season: 2027, startDate: "2027-06-16" })

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [
					{ sourceEventId: first.id, name: "Individual LG/LN", startDate: "2027-05-05" },
					{ sourceEventId: second.id, name: "Chicago 19", startDate: "2027-06-16" },
				],
			})

			expect(res.status).toBe(409)
			expect((res.body as { message: string[] }).message).toEqual([
				'Chicago 19 (2027-06-16): An event named "Chicago 19" already exists on 2027-06-16',
			])
			expect(await eventsOf(2027)).toHaveLength(1)
			expect(await testDb().select().from(adminAuditEntry)).toHaveLength(0)
		})

		it("refuses two events with the same name on the same date", async () => {
			const first = await weeknight()
			const second = await weeknight({ startDate: "2026-05-13" })

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [
					{ sourceEventId: first.id, name: "Individual LG/LN", startDate: "2027-05-05" },
					{ sourceEventId: second.id, name: "Individual LG/LN", startDate: "2027-05-05" },
				],
			})

			expect(res.status).toBe(409)
			expect(await eventsOf(2027)).toHaveLength(0)
		})

		it("refuses names that differ only in case, as the database's unique index would", async () => {
			const first = await weeknight()
			const second = await weeknight({ name: "Chicago 19", startDate: "2026-06-17" })
			await weeknight({ name: "Chicago 19", season: 2027, startDate: "2027-06-16" })

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [
					{ sourceEventId: first.id, name: "Individual LG/LN", startDate: "2027-05-05" },
					{ sourceEventId: second.id, name: "CHICAGO 19", startDate: "2027-06-16" },
				],
			})

			expect(res.status).toBe(409)
			expect((res.body as { message: string[] }).message).toEqual([
				'CHICAGO 19 (2027-06-16): An event named "CHICAGO 19" already exists on 2027-06-16',
			])
		})

		it("refuses two events in the batch whose names differ only in case", async () => {
			const first = await weeknight()
			const second = await weeknight({ startDate: "2026-05-13" })

			const res = await preview({
				fromSeason: 2026,
				toSeason: 2027,
				events: [
					{ sourceEventId: first.id, name: "Individual LG/LN", startDate: "2027-05-05" },
					{ sourceEventId: second.id, name: "individual lg/ln", startDate: "2027-05-05" },
				],
			})

			const events = (res.body as { events: Proposal[] }).events
			expect(events.every((e) => e.issues.some((i) => i.startsWith("Another event")))).toBe(true)
		})

		it("refuses an event from another season", async () => {
			const other = await weeknight({ season: 2025, startDate: "2025-05-07" })

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [{ sourceEventId: other.id, name: "Individual LG/LN", startDate: "2027-05-05" }],
			})

			expect(res.status).toBe(400)
		})

		it("refuses an event where players choose slots but there are no courses", async () => {
			const source = await weeknight()
			await testDb()
				.delete(eventCourses)
				.where(inArray(eventCourses.eventId, [source.id]))

			const res = await apply({
				fromSeason: 2026,
				toSeason: 2027,
				events: [{ sourceEventId: source.id, name: "Individual LG/LN", startDate: "2027-05-05" }],
			})

			expect(res.status).toBe(409)
			expect(await eventsOf(2027)).toHaveLength(0)
		})
	})
})
