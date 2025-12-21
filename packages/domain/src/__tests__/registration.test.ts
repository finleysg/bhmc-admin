import {
	calculateStartingHole,
	calculateTeeTime,
	getGroup,
	getStart,
} from "../functions/registration"
import { ClubEvent, Hole, RegistrationSlot, StartTypeChoices } from "../types"

describe("calculateTeeTime", () => {
	const baseEvent = {
		startTime: "8:00 AM",
		teeTimeSplits: "9",
		starterTimeInterval: 0,
	} as ClubEvent

	const slot = { startingOrder: 0 } as RegistrationSlot

	it("returns base time for slot 0", () => {
		expect(calculateTeeTime(baseEvent, slot)).toBe("8:00 AM")
	})

	it("calculates with splits", () => {
		const event = { ...baseEvent, teeTimeSplits: "10,9" } as ClubEvent
		const slot1 = { startingOrder: 1 } as RegistrationSlot
		expect(calculateTeeTime(event, slot1)).toBe("8:10 AM")
		const slot2 = { startingOrder: 2 } as RegistrationSlot
		expect(calculateTeeTime(event, slot2)).toBe("8:19 AM")
	})

	it("handles starter intervals", () => {
		const event = { ...baseEvent, starterTimeInterval: 4 } as ClubEvent
		const slot4 = { startingOrder: 4 } as RegistrationSlot
		expect(calculateTeeTime(event, slot4)).toBe("8:45 AM") // 5*9 = 45 min
	})

	it("throws on missing startTime", () => {
		const event = { ...baseEvent, startTime: undefined } as ClubEvent
		expect(() => calculateTeeTime(event, slot)).toThrow("Missing event.startTime")
	})

	it("throws on negative slot", () => {
		const negativeSlot = { startingOrder: -1 } as RegistrationSlot
		expect(() => calculateTeeTime(baseEvent, negativeSlot)).toThrow("Slot must be non-negative")
	})
})

describe("calculateStartingHole", () => {
	const holes = [{ id: 1, holeNumber: 8 } as Hole, { id: 2, holeNumber: 10 } as Hole]

	it("calculates A for order 0", () => {
		const slot = { holeId: 1, startingOrder: 0 } as RegistrationSlot
		expect(calculateStartingHole(slot, holes)).toBe("8A")
	})

	it("calculates B for order 1", () => {
		const slot = { holeId: 1, startingOrder: 1 } as RegistrationSlot
		expect(calculateStartingHole(slot, holes)).toBe("8B")
	})

	it("throws on missing holeId", () => {
		const slot = { startingOrder: 0 } as RegistrationSlot
		expect(() => calculateStartingHole(slot, holes)).toThrow("Missing holeId")
	})

	it("throws on hole not found", () => {
		const slot = { holeId: 99, startingOrder: 0 } as RegistrationSlot
		expect(() => calculateStartingHole(slot, holes)).toThrow("Hole with id 99 not found")
	})

	it("throws on invalid order", () => {
		const slot = { holeId: 1, startingOrder: 2 } as RegistrationSlot
		expect(() => calculateStartingHole(slot, holes)).toThrow("Invalid startingOrder: 2")
	})
})

describe("getGroup", () => {
	const baseEvent = {
		eventType: "N",
		startType: "TT",
	} as ClubEvent

	const slot = {
		registrationId: 123,
		startingOrder: 0,
	} as RegistrationSlot

	const courseName = "Test Course"

	it("returns course-teeTime for N+TT", () => {
		const startValue = "8:00 AM"
		expect(getGroup(baseEvent, slot, startValue, courseName)).toBe("Test Course-8:00 AM")
	})

	it("returns course-hole for N+SG", () => {
		const event = { ...baseEvent, startType: "SG" } as ClubEvent
		const startValue = "8A"
		expect(getGroup(event, slot, startValue, courseName)).toBe("Test Course-8A")
	})

	it("returns registrationId for W event", () => {
		const event = { eventType: "W" } as ClubEvent
		expect(getGroup(event, slot, "", courseName)).toBe("123")
	})

	it("returns registrationId for O event", () => {
		const event = { eventType: "O" } as ClubEvent
		expect(getGroup(event, slot, "", courseName)).toBe("123")
	})

	it("handles team suffixes for W with teamSize 2 and 4 slots", () => {
		const event = { eventType: "W", teamSize: 2 } as ClubEvent
		const slots = [
			{ id: 1, registrationId: 123, slot: 0 } as RegistrationSlot,
			{ id: 2, registrationId: 123, slot: 1 } as RegistrationSlot,
			{ id: 3, registrationId: 123, slot: 2 } as RegistrationSlot,
			{ id: 4, registrationId: 123, slot: 3 } as RegistrationSlot,
		]
		expect(getGroup(event, slots[0], "", courseName, slots)).toBe("123a")
		expect(getGroup(event, slots[1], "", courseName, slots)).toBe("123a")
		expect(getGroup(event, slots[2], "", courseName, slots)).toBe("123b")
		expect(getGroup(event, slots[3], "", courseName, slots)).toBe("123b")
	})

	it("throws on missing registrationId for W/O", () => {
		const event = { eventType: "W" } as ClubEvent
		const noRegSlot = { startingOrder: 0 } as RegistrationSlot
		expect(() => getGroup(event, noRegSlot, "", courseName)).toThrow("Missing registrationId")
	})
})

describe("getStart", () => {
	const holes = [{ id: 1, holeNumber: 8 }] as Hole[]

	it("returns tee time for TT", () => {
		const event = {
			canChoose: true,
			startType: "TT",
			startTime: "8:00 AM",
			teeTimeSplits: "9",
		} as ClubEvent
		const slot = { startingOrder: 0 } as RegistrationSlot
		expect(getStart(event, slot, holes)).toBe("8:00 AM")
	})

	it("returns starting hole for SG", () => {
		const event = {
			canChoose: true,
			startType: "SG",
		} as ClubEvent
		const slot = { holeId: 1, startingOrder: 0 } as RegistrationSlot
		expect(getStart(event, slot, holes)).toBe("8A")
	})

	it("returns N/A when canChoose is false", () => {
		const event = { canChoose: false } as ClubEvent
		const slot = {} as RegistrationSlot
		expect(getStart(event, slot, holes)).toBe("N/A")
	})

	it("returns N/A for unknown startType", () => {
		const event = {
			canChoose: true,
			startType: StartTypeChoices.NONE,
		} as ClubEvent
		const slot = {} as RegistrationSlot
		expect(getStart(event, slot, holes)).toBe("N/A")
	})
})
