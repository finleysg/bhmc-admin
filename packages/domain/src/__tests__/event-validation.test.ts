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
		ggId: "round123",
	}

	const mockTournament = {
		id: 1,
		eventId: 1,
		roundId: 1,
		name: "Championship",
		format: "stroke",
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

		it("returns null when event has no id", () => {
			const event = { ...validCompleteEvent, id: undefined }
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when eventFee has no id", () => {
			const event = {
				...validCompleteEvent,
				eventFees: [{ ...mockEventFee, id: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when feeType has no id", () => {
			const event = {
				...validCompleteEvent,
				eventFees: [{ ...mockEventFee, feeType: { ...mockEventFee.feeType, id: undefined } }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have course without id", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, id: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have hole without id", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, holes: [{ ...mockHole, id: undefined }] }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have tee without id", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, tees: [{ ...mockTee, id: undefined }] }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have empty holes array", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, holes: [] }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have empty tees array", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, tees: [] }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have undefined holes", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, holes: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when courses have undefined tees", () => {
			const event = {
				...validCompleteEvent,
				canChoose: true,
				courses: [{ ...mockCourse, tees: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when round has no id", () => {
			const event = {
				...validCompleteEvent,
				eventRounds: [{ ...mockRound, id: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when round has no ggId", () => {
			const event = {
				...validCompleteEvent,
				eventRounds: [{ ...mockRound, ggId: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when tournament has no id", () => {
			const event = {
				...validCompleteEvent,
				tournaments: [{ ...mockTournament, id: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})

		it("returns null when tournament has no ggId", () => {
			const event = {
				...validCompleteEvent,
				tournaments: [{ ...mockTournament, ggId: undefined }],
			}
			const result = validateClubEvent(event)
			expect(result).toBeNull()
		})
	})
})
