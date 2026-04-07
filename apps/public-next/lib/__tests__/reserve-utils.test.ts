import type { ClubEventDetail, Course, Hole, RegistrationSlot } from "../types"
import {
	calculateTeetime,
	calculateWave,
	getAvailabilityMessage,
	getGroupStartName,
	getMinimumSelectedSlots,
	getTeeTimeSplits,
	loadReserveTables,
	transformSSESlots,
} from "../registration/reserve-utils"
import type { ReserveGroup } from "../registration/reserve-utils"
import type { SSESlotData } from "../registration/types"

function makeHole(overrides: Partial<Hole> = {}): Hole {
	return { id: 1, course_id: 1, hole_number: 1, par: 4, ...overrides }
}

function makeCourse(overrides: Partial<Course> = {}): Course {
	return {
		id: 1,
		name: "East",
		number_of_holes: 9,
		gg_id: null,
		color: null,
		holes: [makeHole()],
		tees: [],
		...overrides,
	}
}

function makeEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Wednesday Weeknight",
		rounds: 1,
		ghin_required: false,
		total_groups: 6,
		status: "S",
		minimum_signup_group_size: 1,
		maximum_signup_group_size: 5,
		group_size: 5,
		start_type: "TT",
		can_choose: true,
		registration_window: "future",
		external_url: null,
		season: 2024,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: "I",
		season_points: 1,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2024-06-15",
		start_time: "3:00 PM",
		registration_type: "M",
		signup_start: null,
		signup_end: null,
		signup_waves: null,
		payments_end: null,
		registration_maximum: null,
		courses: [makeCourse()],
		fees: [],
		sessions: [],
		default_tag: null,
		starter_time_interval: 8,
		team_size: 1,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

function makeSlot(overrides: Partial<RegistrationSlot> = {}): RegistrationSlot {
	return {
		id: 1,
		event: 1,
		registration: null,
		hole: 1,
		starting_order: 0,
		slot: 0,
		status: "A",
		session: null,
		player: null,
		...overrides,
	}
}

describe("getTeeTimeSplits", () => {
	it("returns default split when tee_time_splits is null", () => {
		const event = makeEvent({ tee_time_splits: null })
		expect(getTeeTimeSplits(event)).toEqual([8])
	})

	it("parses a single split value", () => {
		const event = makeEvent({ tee_time_splits: "9" })
		expect(getTeeTimeSplits(event)).toEqual([9])
	})

	it("parses alternating split values", () => {
		const event = makeEvent({ tee_time_splits: "8,9" })
		expect(getTeeTimeSplits(event)).toEqual([8, 9])
	})
})

describe("calculateTeetime", () => {
	const startTime = new Date(2024, 5, 15, 15, 0) // 3:00 PM

	it("returns start time for first group", () => {
		expect(calculateTeetime(startTime, 0, [8])).toBe("3:00 PM")
	})

	it("offsets by interval for subsequent groups", () => {
		expect(calculateTeetime(startTime, 1, [8])).toBe("3:08 PM")
		expect(calculateTeetime(startTime, 2, [8])).toBe("3:16 PM")
		expect(calculateTeetime(startTime, 3, [8])).toBe("3:24 PM")
	})

	it("handles alternating intervals", () => {
		expect(calculateTeetime(startTime, 0, [8, 9])).toBe("3:00 PM")
		expect(calculateTeetime(startTime, 1, [8, 9])).toBe("3:08 PM")
		expect(calculateTeetime(startTime, 2, [8, 9])).toBe("3:17 PM")
		expect(calculateTeetime(startTime, 3, [8, 9])).toBe("3:25 PM")
		expect(calculateTeetime(startTime, 4, [8, 9])).toBe("3:34 PM")
	})
})

describe("calculateWave", () => {
	it("returns 0 when signupWaves is null", () => {
		expect(calculateWave(0, 18, null)).toBe(0)
	})

	it("returns 0 when signupWaves is 0", () => {
		expect(calculateWave(0, 18, 0)).toBe(0)
	})

	it("distributes groups evenly across waves", () => {
		// 18 groups / 3 waves = 6 per wave
		expect(calculateWave(0, 18, 3)).toBe(1)
		expect(calculateWave(5, 18, 3)).toBe(1)
		expect(calculateWave(6, 18, 3)).toBe(2)
		expect(calculateWave(11, 18, 3)).toBe(2)
		expect(calculateWave(12, 18, 3)).toBe(3)
		expect(calculateWave(17, 18, 3)).toBe(3)
	})

	it("handles uneven distribution", () => {
		// 10 groups / 3 waves: first wave gets 4 (ceil), second 3, third 3
		expect(calculateWave(0, 10, 3)).toBe(1)
		expect(calculateWave(3, 10, 3)).toBe(1)
		expect(calculateWave(4, 10, 3)).toBe(2)
		expect(calculateWave(7, 10, 3)).toBe(3)
		expect(calculateWave(9, 10, 3)).toBe(3)
	})
})

describe("loadReserveTables", () => {
	it("returns empty array when no slots", () => {
		const event = makeEvent()
		expect(loadReserveTables(event, [])).toEqual([])
	})

	it("creates tee time tables for TT events", () => {
		const hole = makeHole({ id: 10 })
		const course = makeCourse({ holes: [hole] })
		const event = makeEvent({
			start_type: "TT",
			total_groups: 3,
			start_time: "3:00 PM",
			courses: [course],
		})
		const slots = [
			makeSlot({ id: 1, hole: 10, starting_order: 0, slot: 0 }),
			makeSlot({ id: 2, hole: 10, starting_order: 0, slot: 1 }),
			makeSlot({ id: 3, hole: 10, starting_order: 1, slot: 0 }),
			makeSlot({ id: 4, hole: 10, starting_order: 1, slot: 1 }),
			makeSlot({ id: 5, hole: 10, starting_order: 2, slot: 0 }),
			makeSlot({ id: 6, hole: 10, starting_order: 2, slot: 1 }),
		]

		const tables = loadReserveTables(event, slots)
		expect(tables).toHaveLength(1)
		expect(tables[0].course.name).toBe("East")
		expect(tables[0].groups).toHaveLength(3)
		expect(tables[0].groups[0].name).toBe("3:00 PM")
		expect(tables[0].groups[1].name).toBe("3:08 PM")
		expect(tables[0].groups[2].name).toBe("3:16 PM")
		expect(tables[0].groups[0].slots).toHaveLength(2)
	})

	it("creates shotgun tables for SG events", () => {
		const hole1 = makeHole({ id: 10, hole_number: 1 })
		const hole2 = makeHole({ id: 11, hole_number: 2 })
		const course = makeCourse({ holes: [hole1, hole2] })
		const event = makeEvent({
			start_type: "SG",
			courses: [course],
		})
		const slots = [
			makeSlot({ id: 1, hole: 10, starting_order: 0, slot: 0 }),
			makeSlot({ id: 2, hole: 10, starting_order: 1, slot: 0 }),
			makeSlot({ id: 3, hole: 11, starting_order: 0, slot: 0 }),
			makeSlot({ id: 4, hole: 11, starting_order: 1, slot: 0 }),
		]

		const tables = loadReserveTables(event, slots)
		expect(tables).toHaveLength(1)
		expect(tables[0].groups).toHaveLength(4)
		expect(tables[0].groups[0].name).toBe("1A")
		expect(tables[0].groups[1].name).toBe("1B")
		expect(tables[0].groups[2].name).toBe("2A")
		expect(tables[0].groups[3].name).toBe("2B")
	})

	it("throws for invalid start type", () => {
		const event = makeEvent({ start_type: "NA" })
		const slots = [makeSlot()]
		expect(() => loadReserveTables(event, slots)).toThrow("invalid start type")
	})

	it("assigns waves to groups", () => {
		const hole = makeHole({ id: 10 })
		const course = makeCourse({ holes: [hole] })
		const event = makeEvent({
			start_type: "TT",
			total_groups: 6,
			signup_waves: 2,
			courses: [course],
		})
		const slots = Array.from({ length: 6 }, (_, i) =>
			makeSlot({ id: i + 1, hole: 10, starting_order: i, slot: 0 }),
		)

		const tables = loadReserveTables(event, slots)
		expect(tables[0].groups[0].wave).toBe(1)
		expect(tables[0].groups[2].wave).toBe(1)
		expect(tables[0].groups[3].wave).toBe(2)
		expect(tables[0].groups[5].wave).toBe(2)
	})
})

describe("getGroupStartName", () => {
	it("returns tee time for TT events", () => {
		const event = makeEvent({ start_type: "TT", start_time: "3:00 PM" })
		expect(getGroupStartName(event, 1, 0)).toBe("3:00 PM")
		expect(getGroupStartName(event, 1, 1)).toBe("3:08 PM")
	})

	it("returns hole + A/B for shotgun events", () => {
		const event = makeEvent({ start_type: "SG" })
		expect(getGroupStartName(event, 5, 0)).toBe("5A")
		expect(getGroupStartName(event, 5, 1)).toBe("5B")
	})
})

function makeGroup(overrides: Partial<ReserveGroup> = {}): ReserveGroup {
	return {
		id: "east-3:00 pm",
		courseId: 1,
		holeId: 10,
		holeNumber: 1,
		slots: [],
		startingOrder: 0,
		name: "3:00 PM",
		wave: 1,
		...overrides,
	}
}

describe("getAvailabilityMessage", () => {
	it("returns undefined when wave is already available", () => {
		const group = makeGroup({ wave: 1 })
		const result = getAvailabilityMessage(group, true, 1)
		expect(result).toBeUndefined()
	})

	it("returns unlock time when currentWave is null (pre-SSE) and unlock times exist", () => {
		const group = makeGroup({ wave: 2 })
		const waveUnlockTimes = [new Date(2026, 1, 18, 18, 0), new Date(2026, 1, 18, 18, 15)]
		const result = getAvailabilityMessage(group, false, null, waveUnlockTimes)
		expect(result).toBe("Opens at 6:15 PM")
	})

	it("returns undefined when currentWave is null and no times available", () => {
		const group = makeGroup({ wave: 1 })
		const result = getAvailabilityMessage(group, false, null)
		expect(result).toBeUndefined()
	})

	it("returns formatted unlock time for a wave-locked group", () => {
		const group = makeGroup({ wave: 2 })
		const waveUnlockTimes = [
			new Date(2026, 1, 18, 18, 0), // wave 1: 6:00 PM
			new Date(2026, 1, 18, 18, 15), // wave 2: 6:15 PM
		]
		const result = getAvailabilityMessage(group, false, 1, waveUnlockTimes)
		expect(result).toBe("Opens at 6:15 PM")
	})

	it("returns correct time for wave 1 when current wave is 0", () => {
		const group = makeGroup({ wave: 1 })
		const waveUnlockTimes = [
			new Date(2026, 1, 18, 18, 0), // wave 1: 6:00 PM
			new Date(2026, 1, 18, 18, 15), // wave 2: 6:15 PM
		]
		const result = getAvailabilityMessage(group, false, 0, waveUnlockTimes)
		expect(result).toBe("Opens at 6:00 PM")
	})

	it("falls back to registrationStartTime when no waveUnlockTimes", () => {
		const group = makeGroup({ wave: 1 })
		const registrationStartTime = new Date(2026, 1, 18, 17, 30) // 5:30 PM
		const result = getAvailabilityMessage(group, false, 0, undefined, registrationStartTime)
		expect(result).toBe("Opens at 5:30 PM")
	})

	it("falls back to registrationStartTime when waveUnlockTimes is empty", () => {
		const group = makeGroup({ wave: 1 })
		const registrationStartTime = new Date(2026, 1, 18, 17, 30)
		const result = getAvailabilityMessage(group, false, 0, [], registrationStartTime)
		expect(result).toBe("Opens at 5:30 PM")
	})

	it("returns undefined when wave-locked but no times available", () => {
		const group = makeGroup({ wave: 1 })
		const result = getAvailabilityMessage(group, false, 0)
		expect(result).toBeUndefined()
	})

	it("returns undefined for wave 0 groups (no wave assignment)", () => {
		const group = makeGroup({ wave: 0 })
		const waveUnlockTimes = [new Date(2026, 1, 18, 18, 0)]
		const result = getAvailabilityMessage(group, false, 0, waveUnlockTimes)
		expect(result).toBeUndefined()
	})
})

describe("getMinimumSelectedSlots", () => {
	it("returns minimum_signup_group_size during priority window", () => {
		const now = new Date("2026-02-18T17:30:00Z")
		const event = makeEvent({
			priority_signup_start: "2026-02-18T17:00:00Z",
			signup_start: "2026-02-18T18:00:00Z",
			minimum_signup_group_size: 4,
		})
		expect(getMinimumSelectedSlots(event, now)).toBe(4)
	})

	it("returns 1 after priority window ends", () => {
		const now = new Date("2026-02-18T18:30:00Z")
		const event = makeEvent({
			priority_signup_start: "2026-02-18T17:00:00Z",
			signup_start: "2026-02-18T18:00:00Z",
			minimum_signup_group_size: 4,
		})
		expect(getMinimumSelectedSlots(event, now)).toBe(1)
	})

	it("returns 1 when no priority window configured", () => {
		const now = new Date("2026-02-18T17:30:00Z")
		const event = makeEvent({
			priority_signup_start: null,
			signup_start: null,
			minimum_signup_group_size: 4,
		})
		expect(getMinimumSelectedSlots(event, now)).toBe(1)
	})

	it("defaults to 1 when minimum_signup_group_size is null during priority", () => {
		const now = new Date("2026-02-18T17:30:00Z")
		const event = makeEvent({
			priority_signup_start: "2026-02-18T17:00:00Z",
			signup_start: "2026-02-18T18:00:00Z",
			minimum_signup_group_size: null,
		})
		expect(getMinimumSelectedSlots(event, now)).toBe(1)
	})

	it("returns 1 before priority window opens", () => {
		const now = new Date("2026-02-18T16:30:00Z")
		const event = makeEvent({
			priority_signup_start: "2026-02-18T17:00:00Z",
			signup_start: "2026-02-18T18:00:00Z",
			minimum_signup_group_size: 4,
		})
		expect(getMinimumSelectedSlots(event, now)).toBe(1)
	})
})

describe("Register button enablement", () => {
	const priorityEvent = makeEvent({
		priority_signup_start: "2026-02-18T17:00:00Z",
		signup_start: "2026-02-18T18:00:00Z",
		minimum_signup_group_size: 4,
	})
	const duringPriority = new Date("2026-02-18T17:30:00Z")
	const afterPriority = new Date("2026-02-18T18:30:00Z")

	it("disabled during priority when fewer than minimum_signup_group_size selected", () => {
		const minRequired = getMinimumSelectedSlots(priorityEvent, duringPriority)
		expect(1 >= minRequired).toBe(false)
		expect(2 >= minRequired).toBe(false)
		expect(3 >= minRequired).toBe(false)
	})

	it("enabled during priority when exactly minimum_signup_group_size selected", () => {
		const minRequired = getMinimumSelectedSlots(priorityEvent, duringPriority)
		expect(4 >= minRequired).toBe(true)
	})

	it("enabled after priority with a single selected slot", () => {
		const minRequired = getMinimumSelectedSlots(priorityEvent, afterPriority)
		expect(1 >= minRequired).toBe(true)
	})
})

function makeSSESlot(overrides: Partial<SSESlotData> = {}): SSESlotData {
	return {
		id: 1,
		eventId: 42,
		registrationId: null,
		holeId: null,
		player: null,
		startingOrder: 0,
		slot: 0,
		status: "A",
		fees: [],
		...overrides,
	}
}

describe("transformSSESlots", () => {
	it("transforms basic slot fields to snake_case", () => {
		const result = transformSSESlots([
			makeSSESlot({ id: 5, eventId: 42, registrationId: 10, holeId: 7, startingOrder: 3 }),
		])

		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			id: 5,
			event: 42,
			registration: 10,
			hole: 7,
			starting_order: 3,
			slot: 0,
			status: "A",
			player: null,
		})
	})

	it("handles player: null", () => {
		const result = transformSSESlots([makeSSESlot({ player: null })])
		expect(result[0].player).toBeNull()
	})

	it("transforms player fields correctly", () => {
		const result = transformSSESlots([
			makeSSESlot({
				player: {
					id: 99,
					firstName: "John",
					lastName: "Doe",
					email: "john@example.com",
					phoneNumber: "612-555-1234",
					ghin: "1234567",
					tee: "White",
					birthDate: "1980-06-15",
					isMember: true,
					lastSeason: 2025,
				},
			}),
		])

		expect(result[0].player).toEqual({
			id: 99,
			first_name: "John",
			last_name: "Doe",
			email: "john@example.com",
			phone_number: "612-555-1234",
			ghin: "1234567",
			tee: "White",
			birth_date: "1980-06-15",
			is_member: true,
			last_season: 2025,
		})
	})

	it("handles isMember as number (1 → true, 0 → false)", () => {
		const memberResult = transformSSESlots([
			makeSSESlot({
				player: {
					id: 1,
					firstName: "A",
					lastName: "B",
					email: null,
					phoneNumber: null,
					ghin: null,
					tee: null,
					birthDate: null,
					isMember: 1,
					lastSeason: null,
				},
			}),
		])
		expect(memberResult[0].player!.is_member).toBe(true)

		const nonMemberResult = transformSSESlots([
			makeSSESlot({
				player: {
					id: 2,
					firstName: "C",
					lastName: "D",
					email: null,
					phoneNumber: null,
					ghin: null,
					tee: null,
					birthDate: null,
					isMember: 0,
					lastSeason: null,
				},
			}),
		])
		expect(nonMemberResult[0].player!.is_member).toBe(false)
	})

	it("handles isMember as boolean", () => {
		const result = transformSSESlots([
			makeSSESlot({
				player: {
					id: 1,
					firstName: "A",
					lastName: "B",
					email: null,
					phoneNumber: null,
					ghin: null,
					tee: null,
					birthDate: null,
					isMember: false,
					lastSeason: null,
				},
			}),
		])
		expect(result[0].player!.is_member).toBe(false)
	})

	it("null-coalesces optional player fields", () => {
		const result = transformSSESlots([
			makeSSESlot({
				player: {
					id: 1,
					firstName: "A",
					lastName: "B",
					email: null,
					phoneNumber: null,
					ghin: null,
					tee: null,
					birthDate: null,
					isMember: true,
					lastSeason: null,
				},
			}),
		])

		const player = result[0].player!
		expect(player.email).toBeNull()
		expect(player.phone_number).toBeNull()
		expect(player.ghin).toBeNull()
		expect(player.tee).toBeNull()
		expect(player.birth_date).toBeNull()
		expect(player.last_season).toBeNull()
	})

	it("null-coalesces optional slot fields", () => {
		const result = transformSSESlots([makeSSESlot({ registrationId: null, holeId: null })])

		expect(result[0].registration).toBeNull()
		expect(result[0].hole).toBeNull()
	})
})
