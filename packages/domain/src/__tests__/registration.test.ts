import {
	calculateStartingHole,
	calculateTeeTime,
	getGroup,
	getStart,
	getStartingHole,
	getPlayerStartName,
	getPlayerTeamName,
} from "../functions/registration"
import type {
	ClubEvent,
	Hole,
	RegistrationSlot,
	RegisteredPlayer,
	Registration,
	Course,
	Player,
} from "../types"
import { StartTypeChoices, EventTypeChoices, RegistrationStatusChoices } from "../types"

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

// Helper factory functions for RegisteredPlayer tests
const createSlot = (overrides: Partial<RegistrationSlot> = {}): RegistrationSlot => ({
	id: 1,
	registrationId: 100,
	eventId: 1,
	startingOrder: 0,
	slot: 0,
	status: RegistrationStatusChoices.RESERVED,
	...overrides,
})

const createHole = (overrides: Partial<Hole> = {}): Hole => ({
	id: 1,
	courseId: 1,
	holeNumber: 8,
	par: 4,
	...overrides,
})

const createCourse = (overrides: Partial<Course> = {}): Course => ({
	id: 1,
	name: "East Course",
	numberOfHoles: 9,
	...overrides,
})

const createRegistration = (overrides: Partial<Registration> = {}): Registration => ({
	id: 100,
	eventId: 1,
	signedUpBy: "John Doe",
	userId: 1,
	createdDate: "2025-01-01",
	...overrides,
})

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
	id: 1,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	tee: "White",
	isMember: true,
	...overrides,
})

const createRegisteredPlayer = (overrides: Partial<RegisteredPlayer> = {}): RegisteredPlayer => ({
	player: createPlayer(),
	registration: createRegistration(),
	slot: createSlot(),
	course: createCourse(),
	hole: createHole(),
	fees: [],
	...overrides,
})

describe("getStartingHole", () => {
	it("returns hole number with A for order 0", () => {
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
			hole: createHole({ holeNumber: 8 }),
		})
		expect(getStartingHole(rp)).toBe("8A")
	})

	it("returns hole number with B for order 1", () => {
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 1 }),
			hole: createHole({ holeNumber: 10 }),
		})
		expect(getStartingHole(rp)).toBe("10B")
	})

	it("throws for invalid startingOrder", () => {
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 2 }),
		})
		expect(() => getStartingHole(rp)).toThrow("Invalid startingOrder: 2")
	})

	it("returns ERR when hole is missing", () => {
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
			hole: undefined as unknown as Hole,
		})
		expect(getStartingHole(rp)).toBe("ERRA")
	})
})

describe("getPlayerStartName", () => {
	it("returns N/A when canChoose is false", () => {
		const event = { canChoose: false } as ClubEvent
		const rp = createRegisteredPlayer()
		expect(getPlayerStartName(event, rp)).toBe("N/A")
	})

	it("returns tee time for TT start type", () => {
		const event = {
			canChoose: true,
			startType: StartTypeChoices.TEETIMES,
			startTime: "8:00 AM",
			teeTimeSplits: "9",
			starterTimeInterval: 0,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
		})
		expect(getPlayerStartName(event, rp)).toBe("8:00 AM")
	})

	it("returns starting hole for SG start type", () => {
		const event = {
			canChoose: true,
			startType: StartTypeChoices.SHOTGUN,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
			hole: createHole({ holeNumber: 8 }),
		})
		expect(getPlayerStartName(event, rp)).toBe("8A")
	})

	it("returns N/A for unknown start type", () => {
		const event = {
			canChoose: true,
			startType: StartTypeChoices.NONE,
		} as ClubEvent
		const rp = createRegisteredPlayer()
		expect(getPlayerStartName(event, rp)).toBe("N/A")
	})
})

describe("getPlayerTeamName", () => {
	it("returns course-start for N event type", () => {
		const event = {
			eventType: EventTypeChoices.WEEKNIGHT,
			canChoose: true,
			startType: StartTypeChoices.TEETIMES,
			startTime: "8:00 AM",
			teeTimeSplits: "9",
			starterTimeInterval: 0,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
			course: createCourse({ name: "East Course" }),
		})
		expect(getPlayerTeamName(event, rp)).toBe("East Course-8:00 AM")
	})

	it("returns course-hole for N event with shotgun", () => {
		const event = {
			eventType: EventTypeChoices.WEEKNIGHT,
			canChoose: true,
			startType: StartTypeChoices.SHOTGUN,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			slot: createSlot({ startingOrder: 0 }),
			course: createCourse({ name: "West Course" }),
			hole: createHole({ holeNumber: 10 }),
		})
		expect(getPlayerTeamName(event, rp)).toBe("West Course-10A")
	})

	it("returns registrationId for W event type", () => {
		const event = {
			eventType: EventTypeChoices.WEEKEND_MAJOR,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			registration: createRegistration({ id: 456 }),
		})
		expect(getPlayerTeamName(event, rp)).toBe("456")
	})

	it("returns registrationId for O event type", () => {
		const event = {
			eventType: EventTypeChoices.OTHER,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			registration: createRegistration({ id: 789 }),
		})
		expect(getPlayerTeamName(event, rp)).toBe("789")
	})

	it("handles team suffixes for W with teamSize 2 and 4 players", () => {
		const event = {
			eventType: EventTypeChoices.WEEKEND_MAJOR,
			teamSize: 2,
		} as ClubEvent

		const slots = [
			createSlot({ id: 1, slot: 0 }),
			createSlot({ id: 2, slot: 1 }),
			createSlot({ id: 3, slot: 2 }),
			createSlot({ id: 4, slot: 3 }),
		]

		const rp1 = createRegisteredPlayer({
			slot: slots[0],
			registration: createRegistration({ id: 100 }),
		})
		const rp2 = createRegisteredPlayer({
			slot: slots[1],
			registration: createRegistration({ id: 100 }),
		})
		const rp3 = createRegisteredPlayer({
			slot: slots[2],
			registration: createRegistration({ id: 100 }),
		})
		const rp4 = createRegisteredPlayer({
			slot: slots[3],
			registration: createRegistration({ id: 100 }),
		})

		expect(getPlayerTeamName(event, rp1, slots)).toBe("100a")
		expect(getPlayerTeamName(event, rp2, slots)).toBe("100a")
		expect(getPlayerTeamName(event, rp3, slots)).toBe("100b")
		expect(getPlayerTeamName(event, rp4, slots)).toBe("100b")
	})

	it("returns Error for N event when course is missing", () => {
		const event = {
			eventType: EventTypeChoices.WEEKNIGHT,
			canChoose: false,
		} as ClubEvent
		const rp = createRegisteredPlayer({
			course: undefined as unknown as Course,
		})
		expect(getPlayerTeamName(event, rp)).toBe("Error-N/A")
	})
})
