import type { ClubEvent } from "@repo/domain/types"
import {
	shouldDisableCreateSlots,
	shouldDisableAddTeeTime,
	shouldShowRecreateModal,
	getCreateButtonLabel,
} from "../helpers"

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
	startType: "TT",
	canChoose: true,
	ghinRequired: false,
	seasonPoints: null,
	notes: null,
	startDate: "2024-06-01",
	startTime: "8:00 AM",
	signupStart: null,
	signupEnd: null,
	paymentsEnd: null,
	registrationMaximum: null,
	portalUrl: null,
	externalUrl: null,
	status: "S",
	season: 2024,
	teeTimeSplits: "8",
	starterTimeInterval: 0,
	teamSize: 1,
	prioritySignupStart: null,
	signupWaves: null,
	ageRestriction: null,
	ageRestrictionType: "N",
	ggId: null,
	...overrides,
})

describe("shouldDisableCreateSlots", () => {
	it("returns true when isCreatingSlots is true", () => {
		const event = createEvent()
		expect(shouldDisableCreateSlots(true, event)).toBe(true)
	})

	it("returns true when registration has started", () => {
		const pastDate = new Date()
		pastDate.setDate(pastDate.getDate() - 1)
		const event = createEvent({ signupStart: pastDate.toISOString() })
		expect(shouldDisableCreateSlots(false, event)).toBe(true)
	})

	it("returns true when priority signup has started", () => {
		const pastDate = new Date()
		pastDate.setDate(pastDate.getDate() - 1)
		const event = createEvent({ prioritySignupStart: pastDate.toISOString() })
		expect(shouldDisableCreateSlots(false, event)).toBe(true)
	})

	it("returns false when not creating and registration not started", () => {
		const futureDate = new Date()
		futureDate.setDate(futureDate.getDate() + 7)
		const event = createEvent({ signupStart: futureDate.toISOString() })
		expect(shouldDisableCreateSlots(false, event)).toBe(false)
	})

	it("returns false when no signup dates set", () => {
		const event = createEvent({ signupStart: null, prioritySignupStart: null })
		expect(shouldDisableCreateSlots(false, event)).toBe(false)
	})
})

describe("shouldDisableAddTeeTime", () => {
	it("returns true when totalSpots is 0", () => {
		expect(shouldDisableAddTeeTime(0, false)).toBe(true)
	})

	it("returns true when isAddingTeeTime is true", () => {
		expect(shouldDisableAddTeeTime(10, true)).toBe(true)
	})

	it("returns true when both conditions are true", () => {
		expect(shouldDisableAddTeeTime(0, true)).toBe(true)
	})

	it("returns false when totalSpots > 0 and not adding", () => {
		expect(shouldDisableAddTeeTime(10, false)).toBe(false)
	})
})

describe("shouldShowRecreateModal", () => {
	it("returns true when totalSpots > 0", () => {
		expect(shouldShowRecreateModal(10)).toBe(true)
		expect(shouldShowRecreateModal(1)).toBe(true)
	})

	it("returns false when totalSpots is 0", () => {
		expect(shouldShowRecreateModal(0)).toBe(false)
	})
})

describe("getCreateButtonLabel", () => {
	it("returns 'Recreate Slots' when totalSpots > 0", () => {
		expect(getCreateButtonLabel(10)).toBe("Recreate Slots")
		expect(getCreateButtonLabel(1)).toBe("Recreate Slots")
	})

	it("returns 'Create Slots' when totalSpots is 0", () => {
		expect(getCreateButtonLabel(0)).toBe("Create Slots")
	})
})
