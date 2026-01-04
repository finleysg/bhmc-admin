import { ClubEvent, RegistrationTypeChoices, StartTypeChoices } from "@repo/domain/types"
import { getRegistrationWindow, getCurrentWave, getStartingWave } from "../wave-calculator"

function createEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
	return {
		id: 1,
		eventType: "N",
		name: "Test Event",
		registrationType: RegistrationTypeChoices.MEMBER,
		canChoose: true,
		ghinRequired: false,
		startDate: "2025-06-15",
		status: "S",
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 4,
		ageRestrictionType: "N",
		...overrides,
	}
}

describe("getRegistrationWindow", () => {
	describe("n/a cases", () => {
		it("returns n/a for events with no registration", () => {
			const event = createEvent({ registrationType: RegistrationTypeChoices.NONE })
			expect(getRegistrationWindow(event)).toBe("n/a")
		})

		it("returns n/a when signupStart is missing", () => {
			const event = createEvent({ signupStart: null, signupEnd: "2025-06-14T00:00:00" })
			expect(getRegistrationWindow(event)).toBe("n/a")
		})

		it("returns n/a when signupEnd is missing", () => {
			const event = createEvent({ signupStart: "2025-06-01T00:00:00", signupEnd: null })
			expect(getRegistrationWindow(event)).toBe("n/a")
		})
	})

	describe("future window", () => {
		it("returns future before signup starts", () => {
			const event = createEvent({
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-05T12:00:00")
			expect(getRegistrationWindow(event, now)).toBe("future")
		})

		it("returns future before priority signup starts", () => {
			const event = createEvent({
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-05T12:00:00")
			expect(getRegistrationWindow(event, now)).toBe("future")
		})
	})

	describe("priority window", () => {
		it("returns priority during priority signup period", () => {
			const event = createEvent({
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-09T12:00:00")
			expect(getRegistrationWindow(event, now)).toBe("priority")
		})

		it("returns priority at exact priority start time", () => {
			const event = createEvent({
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-08T08:00:00")
			expect(getRegistrationWindow(event, now)).toBe("priority")
		})
	})

	describe("registration window", () => {
		it("returns registration during open signup", () => {
			const event = createEvent({
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-12T12:00:00")
			expect(getRegistrationWindow(event, now)).toBe("registration")
		})

		it("returns registration at exact signup start", () => {
			const event = createEvent({
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-10T08:00:00")
			expect(getRegistrationWindow(event, now)).toBe("registration")
		})

		it("transitions from priority to registration at signupStart", () => {
			const event = createEvent({
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-10T08:00:00")
			expect(getRegistrationWindow(event, now)).toBe("registration")
		})
	})

	describe("past window", () => {
		it("returns past after signup ends", () => {
			const event = createEvent({
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-15T12:00:00")
			expect(getRegistrationWindow(event, now)).toBe("past")
		})

		it("returns past at exact signup end", () => {
			const event = createEvent({
				signupStart: "2025-06-10T08:00:00",
				signupEnd: "2025-06-14T00:00:00",
			})
			const now = new Date("2025-06-14T00:00:00")
			expect(getRegistrationWindow(event, now)).toBe("past")
		})
	})
})

describe("getCurrentWave", () => {
	describe("no wave restrictions", () => {
		it("returns 999 when signupWaves is not set", () => {
			const event = createEvent({
				signupWaves: null,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			expect(getCurrentWave(event)).toBe(999)
		})

		it("returns 999 when prioritySignupStart is not set", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: null,
				signupStart: "2025-06-10T08:00:00",
			})
			expect(getCurrentWave(event)).toBe(999)
		})

		it("returns 999 when signupStart is not set", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: null,
			})
			expect(getCurrentWave(event)).toBe(999)
		})
	})

	describe("before priority signup", () => {
		it("returns 0 before priority signup starts", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			const now = new Date("2025-06-05T12:00:00")
			expect(getCurrentWave(event, now)).toBe(0)
		})
	})

	describe("during priority signup", () => {
		it("returns wave 1 at priority start", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			const now = new Date("2025-06-08T08:00:00")
			expect(getCurrentWave(event, now)).toBe(1)
		})

		it("calculates wave based on elapsed time", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00", // 48 hours before signupStart
				signupStart: "2025-06-10T08:00:00",
			})
			// Wave duration = 48h / 4 = 12h per wave
			// 6 hours in = still wave 1
			const now = new Date("2025-06-08T14:00:00")
			expect(getCurrentWave(event, now)).toBe(1)
		})

		it("returns wave 2 in second quarter", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			// 12 hours in = wave 2 (12h / 12h = 1, floor + 1 = 2)
			const now = new Date("2025-06-08T20:00:00")
			expect(getCurrentWave(event, now)).toBe(2)
		})

		it("returns wave 4 in last quarter", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			// 42 hours in = wave 4
			const now = new Date("2025-06-10T02:00:00")
			expect(getCurrentWave(event, now)).toBe(4)
		})
	})

	describe("after regular signup starts", () => {
		it("returns signupWaves + 1 after regular signup starts", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			const now = new Date("2025-06-10T08:00:00")
			expect(getCurrentWave(event, now)).toBe(5)
		})

		it("returns signupWaves + 1 well after signup starts", () => {
			const event = createEvent({
				signupWaves: 4,
				prioritySignupStart: "2025-06-08T08:00:00",
				signupStart: "2025-06-10T08:00:00",
			})
			const now = new Date("2025-06-12T12:00:00")
			expect(getCurrentWave(event, now)).toBe(5)
		})
	})
})

describe("getStartingWave", () => {
	describe("no wave restrictions", () => {
		it("returns 1 when signupWaves is not set", () => {
			const event = createEvent({ signupWaves: null, totalGroups: 18 })
			expect(getStartingWave(event, 5)).toBe(1)
		})

		it("returns 1 when totalGroups is not set", () => {
			const event = createEvent({ signupWaves: 4, totalGroups: null })
			expect(getStartingWave(event, 5)).toBe(1)
		})
	})

	describe("tee time starts", () => {
		it("assigns early slots to wave 1", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 16,
				startType: StartTypeChoices.TEETIMES,
			})
			// 16 groups / 4 waves = 4 groups per wave
			expect(getStartingWave(event, 0)).toBe(1)
			expect(getStartingWave(event, 1)).toBe(1)
			expect(getStartingWave(event, 2)).toBe(1)
			expect(getStartingWave(event, 3)).toBe(1)
		})

		it("assigns middle slots to middle waves", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 16,
				startType: StartTypeChoices.TEETIMES,
			})
			expect(getStartingWave(event, 4)).toBe(2)
			expect(getStartingWave(event, 8)).toBe(3)
		})

		it("assigns late slots to wave 4", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 16,
				startType: StartTypeChoices.TEETIMES,
			})
			expect(getStartingWave(event, 12)).toBe(4)
			expect(getStartingWave(event, 15)).toBe(4)
		})

		it("handles uneven distribution (remainder slots)", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 18,
				startType: StartTypeChoices.TEETIMES,
			})
			// 18 / 4 = 4 remainder 2
			// First 2 waves get 5 slots, last 2 get 4 slots
			// Wave 1: 0-4, Wave 2: 5-9, Wave 3: 10-13, Wave 4: 14-17
			expect(getStartingWave(event, 0)).toBe(1)
			expect(getStartingWave(event, 4)).toBe(1)
			expect(getStartingWave(event, 5)).toBe(2)
			expect(getStartingWave(event, 9)).toBe(2)
			expect(getStartingWave(event, 10)).toBe(3)
			expect(getStartingWave(event, 14)).toBe(4)
		})
	})

	describe("shotgun starts", () => {
		it("calculates effective order from hole number and starting order", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 36,
				startType: StartTypeChoices.SHOTGUN,
			})
			// Shotgun formula: (holeNumber - 1) * 2 + startingOrder
			// Hole 1, order 0 = 0
			expect(getStartingWave(event, 0, 1)).toBe(1)
			// Hole 1, order 1 = 1
			expect(getStartingWave(event, 1, 1)).toBe(1)
			// Hole 2, order 0 = 2
			expect(getStartingWave(event, 0, 2)).toBe(1)
			// Hole 10, order 0 = 18
			expect(getStartingWave(event, 0, 10)).toBe(3)
		})

		it("uses startingOrder only when holeNumber not provided", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 16,
				startType: StartTypeChoices.SHOTGUN,
			})
			// Without holeNumber, falls back to just startingOrder
			expect(getStartingWave(event, 4)).toBe(2)
		})
	})

	describe("edge cases", () => {
		it("handles single wave", () => {
			const event = createEvent({
				signupWaves: 1,
				totalGroups: 16,
			})
			expect(getStartingWave(event, 0)).toBe(1)
			expect(getStartingWave(event, 15)).toBe(1)
		})

		it("handles waves equal to totalGroups", () => {
			const event = createEvent({
				signupWaves: 4,
				totalGroups: 4,
			})
			expect(getStartingWave(event, 0)).toBe(1)
			expect(getStartingWave(event, 1)).toBe(2)
			expect(getStartingWave(event, 2)).toBe(3)
			expect(getStartingWave(event, 3)).toBe(4)
		})
	})
})
