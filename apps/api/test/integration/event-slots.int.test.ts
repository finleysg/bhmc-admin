import { eq } from "drizzle-orm"

import {
	adminAuditEntry,
	course,
	event,
	eventCourses,
	hole,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

const OPENED = "2020-01-01 14:00:00.000000"
const auditEntries = () => testDb().select().from(adminAuditEntry)
const slotsOf = (eventId: number) =>
	testDb().select().from(registrationSlot).where(eq(registrationSlot.eventId, eventId))

interface Group {
	holeId: number
	startingOrder: number
	statusCounts: Record<string, number>
	filled: number
	total: number
}

async function addCourse(eventId: number, holeNumbers: number[]) {
	const [c] = await testDb()
		.insert(course)
		.values({ name: `Course ${holeNumbers.join("")}`, numberOfHoles: 9 })
	for (const holeNumber of holeNumbers) {
		await testDb().insert(hole).values({ courseId: c.insertId, holeNumber, par: 4 })
	}
	await testDb().insert(eventCourses).values({ eventId, courseId: c.insertId })
	return c.insertId
}

describe("registration slots", () => {
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

	const post = (path: string) => t.http(eventAdmin).post(path)

	describe("creating slots", () => {
		it("creates one Available group per tee time per course, leaving starter gaps to the tee time calculator", async () => {
			const evt = await createEvent({ totalGroups: 3, groupSize: 4, starterTimeInterval: 3 })
			await addCourse(evt.id, [1, 2])

			const res = await post(`/events/${evt.id}/slots`)

			expect(res.status).toBe(201)
			const groups = res.body as Group[]
			expect(groups).toHaveLength(6)
			expect(groups.every((g) => g.total === 4)).toBe(true)
			const slots = await slotsOf(evt.id)
			expect(slots).toHaveLength(24)
			expect(slots.every((s) => s.status === "A")).toBe(true)
			expect((await auditEntries())[0]).toMatchObject({
				operation: "event.slots.create",
				eventId: evt.id,
				changes: { slotCount: { before: 0, after: 24 } },
			})
		})

		it("creates an A and B group on every hole for a shotgun", async () => {
			const evt = await createEvent({ startType: "SG", groupSize: 4 })
			await testDb().insert(hole).values({ courseId: evt.courseId, holeNumber: 2, par: 3 })

			const res = await post(`/events/${evt.id}/slots`)

			expect(res.status).toBe(201)
			expect((res.body as Group[]).map((g) => g.startingOrder).sort()).toEqual([0, 0, 1, 1])
			expect(await slotsOf(evt.id)).toHaveLength(16)
		})

		it("refuses when the event already has slots", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			await post(`/events/${evt.id}/slots`)

			const res = await post(`/events/${evt.id}/slots`)

			expect(res.status).toBe(409)
			expect(await slotsOf(evt.id)).toHaveLength(8)
		})

		it("refuses after registration has opened", async () => {
			const evt = await createEvent({ totalGroups: 2, prioritySignupStart: OPENED })
			expect((await post(`/events/${evt.id}/slots`)).status).toBe(409)
		})

		it.each([
			["players do not choose slots", { canChoose: 0 }],
			["tee times have no groups per course", { totalGroups: null }],
			["there is no group size", { totalGroups: 2, groupSize: null }],
		])("rejects an event where %s", async (_, overrides) => {
			const evt = await createEvent(overrides)
			expect((await post(`/events/${evt.id}/slots`)).status).toBe(400)
			expect(await slotsOf(evt.id)).toEqual([])
		})
	})

	describe("appending a tee time", () => {
		it("adds a tee time after the last on every course, even after registration opens", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			await post(`/events/${evt.id}/slots`)
			await testDb().update(event).set({ signupStart: OPENED }).where(eq(event.id, evt.id))

			const res = await post(`/events/${evt.id}/slots/tee-times`)

			expect(res.status).toBe(201)
			expect((res.body as Group[]).map((g) => g.startingOrder)).toEqual([0, 1, 2])
			const [row] = await testDb().select().from(event).where(eq(event.id, evt.id))
			expect(row.totalGroups).toBe(3)
			expect((await auditEntries())[1]).toMatchObject({
				operation: "event.slots.append",
				changes: {
					totalGroups: { before: 2, after: 3 },
					appendedStartingOrder: { before: null, after: 2 },
				},
			})
		})

		it("makes the appended tee time Available when a starter time interval is set", async () => {
			const evt = await createEvent({ totalGroups: 2, starterTimeInterval: 3 })
			await post(`/events/${evt.id}/slots`)

			await post(`/events/${evt.id}/slots/tee-times`)

			const appended = (await slotsOf(evt.id)).filter((s) => s.startingOrder === 2)
			expect(appended).toHaveLength(4)
			expect(appended.every((s) => s.status === "A")).toBe(true)
		})

		it("refuses when the event has no slots yet", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			expect((await post(`/events/${evt.id}/slots/tee-times`)).status).toBe(409)
		})

		it("refuses a shotgun event", async () => {
			const evt = await createEvent({ startType: "SG" })
			await post(`/events/${evt.id}/slots`)
			expect((await post(`/events/${evt.id}/slots/tee-times`)).status).toBe(400)
		})
	})

	describe("deleting a group", () => {
		it("deletes an empty group and lowers the groups per course when it was the last", async () => {
			const evt = await createEvent({ totalGroups: 3 })
			const groups = (await post(`/events/${evt.id}/slots`)).body as Group[]
			const last = groups[2]

			const res = await t
				.http(eventAdmin)
				.delete(`/events/${evt.id}/slots/groups/${last.holeId}/${last.startingOrder}`)

			expect(res.status).toBe(200)
			expect(res.body).toHaveLength(2)
			const [row] = await testDb().select().from(event).where(eq(event.id, evt.id))
			expect(row.totalGroups).toBe(2)
			expect((await auditEntries())[1]).toMatchObject({ operation: "event.slots.delete" })
		})

		it("refuses a group with a player in it", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			const [g] = (await post(`/events/${evt.id}/slots`)).body as Group[]
			const player = await createUser()
			const [slot] = await slotsOf(evt.id)
			await testDb()
				.update(registrationSlot)
				.set({ playerId: player.playerId, status: "R" })
				.where(eq(registrationSlot.id, slot.id))

			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/slots/groups/${g.holeId}/0`)

			expect(res.status).toBe(409)
			expect(await slotsOf(evt.id)).toHaveLength(8)
		})

		it("refuses after registration has opened", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			const [g] = (await post(`/events/${evt.id}/slots`)).body as Group[]
			await testDb().update(event).set({ signupStart: OPENED }).where(eq(event.id, evt.id))

			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/slots/groups/${g.holeId}/0`)

			expect(res.status).toBe(409)
		})

		it("returns 404 for a group the event does not have", async () => {
			const evt = await createEvent({ totalGroups: 2 })
			await post(`/events/${evt.id}/slots`)
			const res = await t.http(eventAdmin).delete(`/events/${evt.id}/slots/groups/9999/0`)
			expect(res.status).toBe(404)
		})
	})

	describe("disabling and re-enabling a group", () => {
		const setStatus = (eventId: number, g: Group, status: unknown) =>
			t
				.http(eventAdmin)
				.put(`/events/${eventId}/slots/groups/${g.holeId}/${g.startingOrder}/status`)
				.send({ status })

		it("disables only the empty Available slots, during registration, and re-enables them", async () => {
			const evt = await createEvent({ totalGroups: 1 })
			const [g] = (await post(`/events/${evt.id}/slots`)).body as Group[]
			await testDb().update(event).set({ signupStart: OPENED }).where(eq(event.id, evt.id))
			const player = await createUser()
			const [first] = await slotsOf(evt.id)
			await testDb()
				.update(registrationSlot)
				.set({ playerId: player.playerId, status: "R" })
				.where(eq(registrationSlot.id, first.id))

			const disabled = await setStatus(evt.id, g, "U")

			expect(disabled.status).toBe(200)
			expect((disabled.body as Group[])[0]).toMatchObject({
				statusCounts: { R: 1, U: 3 },
				filled: 1,
			})
			expect((await auditEntries())[1]).toMatchObject({ operation: "event.slots.disable" })

			const enabled = await setStatus(evt.id, g, "A")
			expect((enabled.body as Group[])[0]).toMatchObject({ statusCounts: { R: 1, A: 3 } })
			expect((await auditEntries())[2]).toMatchObject({ operation: "event.slots.enable" })
		})

		it("does not audit a group with nothing to change", async () => {
			const evt = await createEvent({ totalGroups: 1 })
			const [g] = (await post(`/events/${evt.id}/slots`)).body as Group[]

			await setStatus(evt.id, g, "A")

			expect(await auditEntries()).toHaveLength(1)
		})

		it("rejects any other status", async () => {
			const evt = await createEvent({ totalGroups: 1 })
			const [g] = (await post(`/events/${evt.id}/slots`)).body as Group[]
			expect((await setStatus(evt.id, g, "R")).status).toBe(400)
		})
	})

	it("lists the event's groups", async () => {
		const evt = await createEvent({ totalGroups: 2 })
		await post(`/events/${evt.id}/slots`)

		const res = await t.http(eventAdmin).get(`/events/${evt.id}/slots`)

		expect(res.body).toEqual([
			expect.objectContaining({
				startingOrder: 0,
				holeNumber: 1,
				total: 4,
				statusCounts: { A: 4 },
			}),
			expect.objectContaining({
				startingOrder: 1,
				holeNumber: 1,
				total: 4,
				statusCounts: { A: 4 },
			}),
		])
	})
})
