import { validateClubEvent } from "../functions/event-validation"
import {
	AgeRestrictionTypeChoices,
	ClubEvent,
	EventStatusChoices,
	EventTypeChoices,
	FeeRestrictionChoices,
	PayoutTypeChoices,
	RegistrationTypeChoices,
	TournamentFormatChoices,
} from "../types"

describe("validateClubEvent", () => {
	const mockEventFee = {
		id: 1,
		eventId: 1,
		amount: 100,
		isRequired: true,
		displayOrder: 1,
		feeTypeId: 1,
		feeType: {
			id: 1,
			name: "Entry Fee",
			code: "ENTRY",
			payout: PayoutTypeChoices.CASH,
			restriction: FeeRestrictionChoices.MEMBERS,
		},
	}

	const mockRound = {
		id: 1,
		eventId: 1,
		roundNumber: 1,
		roundDate: "2025-01-01",
		ggId: "round123",
	}

	const mockTournament = {
		id: 1,
		eventId: 1,
		roundId: 1,
		name: "Championship",
		format: TournamentFormatChoices.STROKE,
		isNet: false,
		ggId: "tourn123",
	}

	const mockHole = {
		id: 1,
		courseId: 1,
		holeNumber: 1,
		par: 4,
	}

	const mockTee = {
		id: 1,
		courseId: 1,
		name: "Champion",
	}

	const mockCourse = {
		id: 1,
		name: "Pine Valley",
		numberOfHoles: 18,
		holes: [mockHole],
		tees: [mockTee],
	}

	const validBaseEvent: ClubEvent = {
		id: 123,
		eventType: EventTypeChoices.WEEKNIGHT,
		name: "Test Event",
		registrationType: RegistrationTypeChoices.MEMBER,
		canChoose: false,
		ghinRequired: false,
		startDate: "2025-01-01",
		status: EventStatusChoices.SCHEDULED,
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 1,
		ageRestrictionType: AgeRestrictionTypeChoices.NONE,
		eventFees: [mockEventFee],
	}

	const validCompleteEvent: ClubEvent = {
		...validBaseEvent,
		id: 456,
		ggId: "12345",
		eventRounds: [mockRound],
		tournaments: [mockTournament],
	}

	describe("event validation", () => {
		it("returns ValidatedClubEvent for fully valid event", () => {
			const result = validateClubEvent(validCompleteEvent)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
			if (!result) throw new Error("Result should not be null")
			expect("ggId" in result && result.ggId).toBe("12345") // Type guard for ValidatedClubEvent
			expect(result.eventRounds).toHaveLength(1)
			expect(result.tournaments).toHaveLength(1)
		})

		it("throws for missing ggId", () => {
			const event = { ...validCompleteEvent, ggId: undefined }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for null ggId", () => {
			const event = { ...validCompleteEvent, ggId: null }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for empty eventRounds", () => {
			const event = { ...validCompleteEvent, eventRounds: [] }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for missing eventRounds", () => {
			const event = { ...validCompleteEvent, eventRounds: undefined }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for empty tournaments", () => {
			const event = { ...validCompleteEvent, tournaments: [] }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for missing tournaments", () => {
			const event = { ...validCompleteEvent, tournaments: undefined }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for missing eventFees", () => {
			const event = { ...validCompleteEvent, eventFees: undefined }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for empty eventFees", () => {
			const event = { ...validCompleteEvent, eventFees: [] }
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws for eventFees without feeType", () => {
			const event = {
				...validCompleteEvent,
				eventFees: [{ ...mockEventFee, feeType: undefined }],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws when canChoose=true and no courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: undefined,
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws when canChoose=true and empty courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("returns ValidatedClubEvent when canChoose=true and has courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [mockCourse],
			}
			const result = validateClubEvent(event)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
		})

		it("returns ValidatedClubEvent when canChoose=false regardless of courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: false,
				courses: undefined,
			}
			const result = validateClubEvent(event)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
		})

		it("throws when courses have empty holes array", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, holes: [] }],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws when courses have empty tees array", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, tees: [] }],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws when courses have undefined holes", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, holes: undefined }],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})

		it("throws when courses have undefined tees", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, tees: undefined }],
			}
			expect(() => validateClubEvent(event)).toThrow()
		})
	})
})
