import { PublicSiteService } from "../../src/public-site"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb } from "./support/db"
import { createEvent, createUser, TestUser } from "./support/factories"

/** A valid weeknight event where players choose tee times, as the workspace sends it. */
function settings(overrides: Record<string, unknown> = {}) {
	return {
		eventType: "N",
		name: "Weeknight Stroke",
		rounds: null,
		registrationType: "M",
		skinsType: null,
		minimumSignupGroupSize: 1,
		maximumSignupGroupSize: 5,
		groupSize: 5,
		totalGroups: 15,
		startType: "TT",
		canChoose: true,
		ghinRequired: false,
		seasonPoints: null,
		notes: null,
		startDate: "2027-05-05",
		startTime: "3:00 PM",
		prioritySignupStart: null,
		signupStart: "2027-04-28T14:00:00.000Z",
		signupEnd: "2027-05-04T17:00:00.000Z",
		paymentsEnd: null,
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
		defaultTagId: null,
		...overrides,
	}
}

describe("public site revalidation", () => {
	let t: TestApp
	let eventAdmin: TestUser
	const revalidate = jest.fn().mockResolvedValue(undefined)

	beforeAll(async () => {
		t = await createTestApp({ overrides: [[PublicSiteService, { revalidate }]] })
	})

	beforeEach(async () => {
		await resetDb()
		revalidate.mockClear()
		eventAdmin = await createUser({ roles: ["event-admin"] })
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	it("clears the public events after creating an event", async () => {
		expect((await t.http(eventAdmin).post("/events").send(settings())).status).toBe(201)
		expect(revalidate).toHaveBeenCalledWith(["events"])
	})

	it("clears the events and the event's slots after editing it", async () => {
		const evt = await createEvent()

		const res = await t
			.http(eventAdmin)
			.put(`/events/${evt.id}`)
			.send(settings({ name: "New" }))

		expect(res.status).toBe(200)
		expect(revalidate).toHaveBeenCalledWith(["events", `event-slots-${evt.id}`])
	})

	it("clears them after a session change", async () => {
		const evt = await createEvent({ canChoose: 0, startType: "NA" })

		const res = await t
			.http(eventAdmin)
			.post(`/events/${evt.id}/sessions`)
			.send({ name: "Morning Swing", registrationLimit: 40, displayOrder: 1, feeOverrides: [] })

		expect(res.status).toBe(201)
		expect(revalidate).toHaveBeenCalledWith(["events", `event-slots-${evt.id}`])
	})

	it("does not clear anything for a read or a refused change", async () => {
		const evt = await createEvent()

		await t.http(eventAdmin).get(`/events/${evt.id}/setup`)
		const refused = await t
			.http(eventAdmin)
			.put(`/events/${evt.id}`)
			.send(settings({ startTime: "Afternoon" }))

		expect(refused.status).toBe(400)
		expect(revalidate).not.toHaveBeenCalled()
	})
})
