import { isBefore, isEqual } from "date-fns"
import { expect, test } from "vitest"

import { getTestEvent, getTestEvents, TestEventType } from "../../test/data/test-events"
import { ClubEvent, ClubEventApiSchema, ClubEventData } from "../club-event"

test("club event test data is valid", () => {
	const events = getTestEvents()
	events.forEach((eventJson) => {
		const result = ClubEventApiSchema.safeParse(eventJson)

		if (!result.success) {
			const { error } = result
			console.error(`${eventJson.name} failed: ${error.message}`)
		}
		expect(result.success).toBe(true)
		if (result.success) {
			const { data } = result
			expect(data).toBeInstanceOf<ClubEventData>

			const model = new ClubEvent(data)
			expect(model).toBeInstanceOf<ClubEvent>
		}
	})
})

test("generates the correct event urls", () => {
	const eventData = getTestEvent(TestEventType.major)
	eventData.name = "2 Man Best Ball"
	eventData.start_date = "2020-10-03"
	const event1 = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event1.eventUrl).toEqual("/event/2020-10-03/2-man-best-ball")

	eventData.name = "Individual LG/LN Test"
	const event2 = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event2.eventUrl).toEqual("/event/2020-10-03/individual-lg-ln-test")

	eventData.name = "Individual LG / LN Test"
	const event3 = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event3.eventUrl).toEqual("/event/2020-10-03/individual-lg-ln-test")

	eventData.name = "Red, White & Blue"
	const event4 = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event4.eventUrl).toEqual("/event/2020-10-03/red-white-blue")
})

test("spreads multi-day events by determining an end date", () => {
	const eventData = getTestEvent(TestEventType.major)
	eventData.name = "2 Man Best Ball"
	eventData.start_date = "2020-10-03"
	const event1 = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(isEqual(event1.startDate, event1.endDate!)).toBe(true)

	const event2 = new ClubEvent(ClubEventApiSchema.parse({ ...eventData, ...{ rounds: 2 } }))
	expect(isEqual(event2.startDate, event2.endDate!)).toBe(false)
	expect(isBefore(event2.startDate, event2.endDate!)).toBe(true)
})

test("converts event fee array into a map", () => {
	const eventData = getTestEvent(TestEventType.major)
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(typeof event.feeMap).toBe("object")
	expect(event.feeMap.get(5)?.amount).toBe(5)
	expect(event.feeMap.get(8)?.amount).toBe(5)
	expect(event.feeMap.get(9)?.amount).toBe(5)
	expect(event.feeMap.get(10)?.amount).toBe(20)
	expect(event.feeMap.get(11)?.amount).toBe(10)
})

test("calculates the available spots for a major", () => {
	const eventData = getTestEvent(TestEventType.major)
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event.availableSpots()).toEqual(100)
})

test("calculates the available spots for a shotgun event", () => {
	const eventData = getTestEvent(TestEventType.shotgun)
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event.availableSpots()).toEqual(270)
})

test("calculates the available spots for tee times", () => {
	const eventData = getTestEvent(TestEventType.weeknight) // 2o teetimes per 9
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))
	expect(event.availableSpots()).toEqual(300)
})

test.each([
	"2024-06-11T17:00:00Z",
	"2024-06-11T18:15:00Z",
	"2024-06-14T19:59:00Z",
	"2024-06-15T10:59:00Z",
])(
	"payments are open if the current time is after priority payments start and before the payment deadline",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.paymentsAreOpen(new Date(currentTime))).toBe(true)
	},
)

test.each(["2024-06-11T16:59:00Z", "2024-06-15T11:01:00Z"])(
	"payments are not open if the current time is before priority payments start or after the payment deadline",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.paymentsAreOpen(new Date(currentTime))).toBe(false)
	},
)

test.each(["2024-06-11T18:15:00Z", "2024-06-14T19:59:00Z"])(
	"registration is open if the current time is after signup start and before signup end",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.registrationIsOpen(new Date(currentTime))).toBe(true)
	},
)

test.each(["2024-06-11T17:59:00Z", "2024-06-14T20:01:00Z"])(
	"registration is not open if the current time is before signup start or after signup end",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.registrationIsOpen(new Date(currentTime))).toBe(false)
	},
)

test.each(["2024-06-11T17:01:00Z", "2024-06-11T17:59:00Z"])(
	"priority registration is open if the current time is after priority signup start and before signup start",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.priorityRegistrationIsOpen(new Date(currentTime))).toBe(true)
	},
)

test.each(["2024-06-11T16:59:00Z", "2024-06-11T18:01:00Z"])(
	"priority registration is not open if the current time is before priority signup start or after signup start",
	(currentTime: string) => {
		const eventData = getTestEvent(TestEventType.weeknight)
		eventData.priority_signup_start = "2024-06-11T17:00:00Z"
		eventData.signup_start = "2024-06-11T18:00:00Z"
		eventData.signup_end = "2024-06-14T20:00:00Z"
		eventData.payments_end = "2024-06-15T11:00:00Z"
		const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

		expect(event.priorityRegistrationIsOpen(new Date(currentTime))).toBe(false)
	},
)

test("getWaveUnlockTimes returns empty array when waves are not configured", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = null
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getWaveUnlockTimes()).toEqual([])
})

test("getWaveUnlockTimes returns empty array when signup_waves is 0", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 0
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getWaveUnlockTimes()).toEqual([])
})

test("getWaveUnlockTimes returns empty array when priority signup start is missing", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 4
	eventData.priority_signup_start = null
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getWaveUnlockTimes()).toEqual([])
})

test("getWaveUnlockTimes returns correct unlock times for 4-wave setup", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 4
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z" // 1 hour priority window
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	const unlockTimes = event.getWaveUnlockTimes()
	expect(unlockTimes).toHaveLength(4)

	// Wave 1 unlocks at priority start
	expect(unlockTimes[0]).toEqual(new Date("2024-06-11T17:00:00Z"))

	// Wave 2 unlocks at 15 minutes later (17:15)
	expect(unlockTimes[1]).toEqual(new Date("2024-06-11T17:15:00Z"))

	// Wave 3 unlocks at 30 minutes later (17:30)
	expect(unlockTimes[2]).toEqual(new Date("2024-06-11T17:30:00Z"))

	// Wave 4 unlocks at 45 minutes later (17:45)
	expect(unlockTimes[3]).toEqual(new Date("2024-06-11T17:45:00Z"))
})

test("getWaveUnlockTimes returns correct unlock times for 3-wave setup", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 3
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T17:30:00Z" // 30 minute priority window
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	const unlockTimes = event.getWaveUnlockTimes()
	expect(unlockTimes).toHaveLength(3)

	// Wave 1 unlocks at priority start
	expect(unlockTimes[0]).toEqual(new Date("2024-06-11T17:00:00Z"))

	// Wave 2 unlocks at 10 minutes later (17:10)
	expect(unlockTimes[1]).toEqual(new Date("2024-06-11T17:10:00Z"))

	// Wave 3 unlocks at 20 minutes later (17:20)
	expect(unlockTimes[2]).toEqual(new Date("2024-06-11T17:20:00Z"))
})

test("getCurrentWave returns 0 when waves are not configured", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = null
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getCurrentWave(new Date("2024-06-11T17:30:00Z"))).toBe(0)
})

test("getCurrentWave returns 0 when signup_waves is 0", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 0
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getCurrentWave(new Date("2024-06-11T17:30:00Z"))).toBe(0)
})

test("getCurrentWave returns 0 when outside priority registration window (before start)", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 4
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getCurrentWave(new Date("2024-06-11T16:59:00Z"))).toBe(0)
})

test("getCurrentWave returns 0 when outside priority registration window (after end)", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 4
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	expect(event.getCurrentWave(new Date("2024-06-11T18:01:00Z"))).toBe(0)
})

test("getCurrentWave returns correct wave number for 4-wave setup", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 4
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T18:00:00Z"
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	// At priority start - wave 1
	expect(event.getCurrentWave(new Date("2024-06-11T17:00:00Z"))).toBe(1)

	// Just after priority start - still wave 1
	expect(event.getCurrentWave(new Date("2024-06-11T17:01:00Z"))).toBe(1)

	// At 15 minutes - wave 2 starts
	expect(event.getCurrentWave(new Date("2024-06-11T17:15:00Z"))).toBe(2)

	// At 30 minutes - wave 3 starts
	expect(event.getCurrentWave(new Date("2024-06-11T17:30:00Z"))).toBe(3)

	// At 45 minutes - wave 4 starts
	expect(event.getCurrentWave(new Date("2024-06-11T17:45:00Z"))).toBe(4)

	// Just before signup start - still wave 4
	expect(event.getCurrentWave(new Date("2024-06-11T17:59:00Z"))).toBe(4)
})

test("getCurrentWave returns correct wave number for 3-wave setup", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 3
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T17:30:00Z" // 30 minute window
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	// At priority start - wave 1
	expect(event.getCurrentWave(new Date("2024-06-11T17:00:00Z"))).toBe(1)

	// At 10 minutes - wave 2 starts
	expect(event.getCurrentWave(new Date("2024-06-11T17:10:00Z"))).toBe(2)

	// At 20 minutes - wave 3 starts
	expect(event.getCurrentWave(new Date("2024-06-11T17:20:00Z"))).toBe(3)

	// Just before signup start - still wave 3
	expect(event.getCurrentWave(new Date("2024-06-11T17:29:00Z"))).toBe(3)
})

test("getCurrentWave does not exceed total waves when time exceeds last wave start but is still within priority window", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	eventData.signup_waves = 2
	eventData.priority_signup_start = "2024-06-11T17:00:00Z"
	eventData.signup_start = "2024-06-11T17:30:00Z" // 30 minute window
	const event = new ClubEvent(ClubEventApiSchema.parse(eventData))

	// At 25 minutes (within the 30 minute window) - should return wave 2
	expect(event.getCurrentWave(new Date("2024-06-11T17:25:00Z"))).toBe(2)
})
