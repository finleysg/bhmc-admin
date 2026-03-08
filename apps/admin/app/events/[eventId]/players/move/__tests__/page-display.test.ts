import { getStart } from "@repo/domain/functions"
import type { ClubEvent, Course, RegistrationSlot, Hole } from "@repo/domain/types"

// Helper function extracted from page.tsx for testing
function findCourseByHoleId(courses: Course[], holeId: number): Course | undefined {
	return courses.find((c) => c.holes?.some((h) => h.id === holeId))
}

const createHole = (id: number, holeNumber: number): Hole => ({
	id,
	courseId: 1,
	holeNumber,
	par: 4,
})

const createCourse = (overrides: Partial<Course> = {}): Course => ({
	id: overrides.id ?? 1,
	name: overrides.name ?? "North",
	numberOfHoles: 18,
	ggId: "course-1",
	holes: overrides.holes ?? [createHole(101, 1), createHole(102, 2), createHole(103, 3)],
	tees: [],
	...overrides,
})

const createSlot = (overrides: Partial<RegistrationSlot> = {}): RegistrationSlot => ({
	id: overrides.id ?? 1,
	registrationId: overrides.registrationId ?? 1,
	eventId: overrides.eventId ?? 1,
	startingOrder: overrides.startingOrder ?? 0,
	slot: overrides.slot ?? 0,
	status: "R",
	holeId: overrides.holeId ?? 101,
	playerId: overrides.playerId ?? 1,
	...overrides,
})

const createEvent = (overrides: Partial<ClubEvent> = {}): ClubEvent => ({
	id: 1,
	eventType: "N",
	name: "Test Event",
	rounds: null,
	registrationType: "M",
	skinsType: "N",
	minimumSignupGroupSize: 1,
	maximumSignupGroupSize: 4,
	groupSize: 4,
	totalGroups: 10,
	startType: overrides.startType ?? "TT",
	canChoose: true,
	ghinRequired: false,
	seasonPoints: null,
	notes: null,
	startDate: "2024-06-01",
	startTime: overrides.startTime ?? "8:00 AM",
	signupStart: null,
	signupEnd: null,
	paymentsEnd: null,
	registrationMaximum: null,
	portalUrl: null,
	externalUrl: null,
	status: "S",
	season: 2024,
	teeTimeSplits: overrides.teeTimeSplits ?? "8",
	starterTimeInterval: 0,
	teamSize: 1,
	prioritySignupStart: null,
	signupWaves: null,
	ageRestriction: null,
	ageRestrictionType: "N",
	ggId: "GG-1",
	...overrides,
})

describe("findCourseByHoleId", () => {
	it("finds course containing the hole", () => {
		const courses = [
			createCourse({ id: 1, name: "North", holes: [createHole(101, 1), createHole(102, 2)] }),
			createCourse({ id: 2, name: "South", holes: [createHole(201, 1), createHole(202, 2)] }),
		]

		expect(findCourseByHoleId(courses, 101)?.name).toBe("North")
		expect(findCourseByHoleId(courses, 201)?.name).toBe("South")
	})

	it("returns undefined when hole not found", () => {
		const courses = [createCourse()]
		expect(findCourseByHoleId(courses, 999)).toBeUndefined()
	})

	it("returns undefined for empty courses array", () => {
		expect(findCourseByHoleId([], 101)).toBeUndefined()
	})
})

describe("Move Player display format - TT (tee times)", () => {
	it("returns tee time format for TT startType", () => {
		const event = createEvent({
			startType: "TT",
			startTime: "8:00 AM",
			teeTimeSplits: "8",
		})
		const course = createCourse()
		const slot = createSlot({ startingOrder: 0 })

		const result = getStart(event, slot, course.holes!)
		expect(result).toBe("8:00 AM")
	})

	it("calculates later tee time based on startingOrder", () => {
		const event = createEvent({
			startType: "TT",
			startTime: "8:00 AM",
			teeTimeSplits: "8",
		})
		const course = createCourse()
		const slot = createSlot({ startingOrder: 3 })

		const result = getStart(event, slot, course.holes!)
		expect(result).toBe("8:24 AM") // 3 * 8 = 24 minutes later
	})
})

describe("Move Player display format - SG (shotgun)", () => {
	it("returns starting hole format for SG startType", () => {
		const event = createEvent({ startType: "SG" })
		const course = createCourse({ holes: [createHole(101, 1)] })
		const slot = createSlot({ holeId: 101, startingOrder: 0 })

		const result = getStart(event, slot, course.holes!)
		expect(result).toBe("1A")
	})

	it("returns B suffix for startingOrder 1", () => {
		const event = createEvent({ startType: "SG" })
		const course = createCourse({ holes: [createHole(105, 5)] })
		const slot = createSlot({ holeId: 105, startingOrder: 1 })

		const result = getStart(event, slot, course.holes!)
		expect(result).toBe("5B")
	})
})

describe("Move Player display - combined From/To format", () => {
	it("TT event: From/To displays course name + tee time", () => {
		const event = createEvent({
			startType: "TT",
			startTime: "8:00 AM",
			teeTimeSplits: "8",
		})
		const course = createCourse({ name: "North" })
		const fromSlot = createSlot({ startingOrder: 0 })
		const toSlot = createSlot({ startingOrder: 3 })

		const fromStart = getStart(event, fromSlot, course.holes!)
		const toStart = getStart(event, toSlot, course.holes!)

		expect(`${course.name} - ${fromStart}`).toBe("North - 8:00 AM")
		expect(`${course.name} - ${toStart}`).toBe("North - 8:24 AM")
	})

	it("SG event: From/To displays course name + starting hole", () => {
		const event = createEvent({ startType: "SG" })
		const course = createCourse({
			name: "South",
			holes: [createHole(101, 1), createHole(105, 5)],
		})
		const fromSlot = createSlot({ holeId: 101, startingOrder: 0 })
		const toSlot = createSlot({ holeId: 105, startingOrder: 1 })

		const fromStart = getStart(event, fromSlot, course.holes!)
		const toStart = getStart(event, toSlot, course.holes!)

		expect(`${course.name} - ${fromStart}`).toBe("South - 1A")
		expect(`${course.name} - ${toStart}`).toBe("South - 5B")
	})
})
