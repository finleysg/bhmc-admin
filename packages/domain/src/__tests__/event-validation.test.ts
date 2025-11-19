import { validateClubEvent } from "../functions/event-validation"
import { ClubEvent } from "../types"

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
			payout: "cash",
			restriction: "none",
		},
	}

	const mockRound = {
		id: 1,
		eventId: 1,
		roundNumber: 1,
		roundDate: "2025-01-01",
	}

	const mockTournament = {
		id: 1,
		eventId: 1,
		roundId: 1,
		name: "Championship",
		format: "stroke",
		isNet: false,
	}

	const mockCourse = {
		id: 1,
		name: "Pine Valley",
		numberOfHoles: 18,
	}

	const validBaseEvent: ClubEvent = {
		eventType: "tournament",
		name: "Test Event",
		registrationType: "individual",
		canChoose: false,
		ghinRequired: false,
		startDate: "2025-01-01",
		status: "active",
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 1,
		ageRestrictionType: "none",
		eventFees: [mockEventFee],
	}

	const validCompleteEvent: ClubEvent = {
		...validBaseEvent,
		ggId: "12345",
		eventRounds: [mockRound],
		tournaments: [mockTournament],
	}

	describe("default validation (excludeGolfGenius = false)", () => {
		it("returns CompleteClubEvent for fully valid event", () => {
			const result = validateClubEvent(validCompleteEvent)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
			if (!result) throw new Error("Result should not be null")
			expect("ggId" in result && result.ggId).toBe("12345") // Type guard for CompleteClubEvent
			expect(result.eventRounds).toHaveLength(1)
			expect(result.tournaments).toHaveLength(1)
		})

		it("returns null for missing ggId", () => {
			const event = { ...validCompleteEvent, ggId: undefined }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for null ggId", () => {
			const event = { ...validCompleteEvent, ggId: null }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for empty eventRounds", () => {
			const event = { ...validCompleteEvent, eventRounds: [] }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for missing eventRounds", () => {
			const event = { ...validCompleteEvent, eventRounds: undefined }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for empty tournaments", () => {
			const event = { ...validCompleteEvent, tournaments: [] }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for missing tournaments", () => {
			const event = { ...validCompleteEvent, tournaments: undefined }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for missing eventFees", () => {
			const event = { ...validCompleteEvent, eventFees: undefined }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for empty eventFees", () => {
			const event = { ...validCompleteEvent, eventFees: [] }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null for eventFees without feeType", () => {
			const event = {
				...validCompleteEvent,
				eventFees: [{ ...mockEventFee, feeType: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when canChoose=true and no courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: undefined,
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when canChoose=true and empty courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns CompleteClubEvent when canChoose=true and has courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [mockCourse],
			}
			const result = validateClubEvent(event)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
		})

		it("returns CompleteClubEvent when canChoose=false regardless of courses", () => {
			const event = {
				...validCompleteEvent,
				canChoose: false,
				courses: undefined,
			}
			const result = validateClubEvent(event)
			expect(result).toBeDefined()
			expect(result).not.toBeNull()
		})
	})

	describe("excludeGolfGenius = true", () => {
		it("returns original ClubEvent for valid event without GolfGenius fields", () => {
			const result = validateClubEvent(validBaseEvent, true)
			expect(result).toBe(validBaseEvent)
			expect(result).toEqual(validBaseEvent)
		})

		it("returns null for missing eventFees", () => {
			const event = { ...validBaseEvent, eventFees: undefined }
			const result = validateClubEvent(event, true)
			expect(result).toBeNull()
		})

		it("returns null for empty eventFees", () => {
			const event = { ...validBaseEvent, eventFees: [] }
			const result = validateClubEvent(event, true)
			expect(result).toBeNull()
		})

		it("returns null for eventFees without feeType", () => {
			const event = {
				...validBaseEvent,
				eventFees: [{ ...mockEventFee, feeType: undefined }],
			}
			const result = validateClubEvent(event, true)
			expect(result).toBeNull()
		})

		it("returns null when canChoose=true and no courses", () => {
			const event = {
				...validBaseEvent,
				canChoose: true,
				courses: undefined,
			}
			const result = validateClubEvent(event, true)
			expect(result).toBeNull()
		})

		it("returns original event when canChoose=false regardless of GolfGenius fields", () => {
			const event = {
				...validBaseEvent,
				ggId: undefined,
				eventRounds: undefined,
				tournaments: undefined,
			}
			const result = validateClubEvent(event, true)
			expect(result).toBe(event)
		})

		it("ignores missing GolfGenius fields when excludeGolfGenius=true", () => {
			const event = {
				...validBaseEvent,
				ggId: undefined,
				eventRounds: undefined,
				tournaments: undefined,
			}
			const result = validateClubEvent(event, true)
			expect(result).toBe(event)
		})
	})
})
