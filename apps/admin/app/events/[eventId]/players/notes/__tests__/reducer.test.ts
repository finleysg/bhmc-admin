import { reducer, initialState, type NotesState } from "../reducer"
import type { CompleteClubEvent, CompleteRegistration } from "@repo/domain/types"

const createEvent = (overrides: Partial<CompleteClubEvent> = {}): CompleteClubEvent => ({
	id: overrides.id ?? 1,
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
	startDate: "2024-01-01",
	startTime: null,
	signupStart: null,
	signupEnd: null,
	paymentsEnd: null,
	registrationMaximum: null,
	portalUrl: null,
	externalUrl: null,
	status: "S",
	season: 2024,
	teeTimeSplits: null,
	starterTimeInterval: 10,
	teamSize: 1,
	prioritySignupStart: null,
	signupWaves: null,
	ageRestriction: null,
	ageRestrictionType: "N",
	ggId: "GG-1",
	eventRounds: [],
	tournaments: [],
	eventFees: [],
	courses: [],
	...overrides,
})

const createRegistration = (
	overrides: Partial<CompleteRegistration> = {},
): CompleteRegistration => ({
	id: overrides.id ?? 1,
	eventId: 1,
	notes: overrides.notes !== undefined ? overrides.notes : "existing notes",
	signedUpBy: "player@example.com",
	userId: 1,
	createdDate: "2024-01-01T00:00:00Z",
	slots: [],
	...overrides,
})

const createState = (overrides: Partial<NotesState> = {}): NotesState => ({
	...initialState,
	...overrides,
})

describe("NotesReducer - SET_EVENT", () => {
	it("stores club event and sets isLoading false", () => {
		const event = createEvent({ id: 42 })
		const result = reducer(initialState, { type: "SET_EVENT", payload: event })

		expect(result.clubEvent).toBe(event)
		expect(result.isLoading).toBe(false)
	})
})

describe("NotesReducer - SET_GROUP", () => {
	it("advances to edit step and stores selectedGroup and notes", () => {
		const group = createRegistration({ notes: "test notes" })
		const result = reducer(initialState, { type: "SET_GROUP", payload: group })

		expect(result.selectedGroup).toBe(group)
		expect(result.notes).toBe("test notes")
		expect(result.step).toBe("edit")
	})

	it("extracts notes from group.notes when present", () => {
		const group = createRegistration({ notes: "some note" })
		const result = reducer(initialState, { type: "SET_GROUP", payload: group })

		expect(result.notes).toBe("some note")
	})

	it("sets empty string when group.notes is null", () => {
		const group = createRegistration({ notes: null })
		const result = reducer(initialState, { type: "SET_GROUP", payload: group })

		expect(result.notes).toBe("")
	})
})

describe("NotesReducer - SET_NOTES", () => {
	it("updates notes field", () => {
		const state = createState({ notes: "old" })
		const result = reducer(state, { type: "SET_NOTES", payload: "new notes" })

		expect(result.notes).toBe("new notes")
	})
})

describe("NotesReducer - SET_PROCESSING", () => {
	it("toggles isProcessing true", () => {
		const result = reducer(initialState, { type: "SET_PROCESSING", payload: true })
		expect(result.isProcessing).toBe(true)
	})

	it("toggles isProcessing false", () => {
		const state = createState({ isProcessing: true })
		const result = reducer(state, { type: "SET_PROCESSING", payload: false })
		expect(result.isProcessing).toBe(false)
	})
})

describe("NotesReducer - SET_SUCCESS", () => {
	it("sets success true and clears error", () => {
		const state = createState({ error: "previous error", isProcessing: true })
		const result = reducer(state, { type: "SET_SUCCESS", payload: true })

		expect(result.success).toBe(true)
		expect(result.error).toBeNull()
		expect(result.isProcessing).toBe(false)
	})
})

describe("NotesReducer - SET_ERROR", () => {
	it("sets error and clears isProcessing", () => {
		const state = createState({ isProcessing: true })
		const result = reducer(state, { type: "SET_ERROR", payload: "error message" })

		expect(result.error).toBe("error message")
		expect(result.isProcessing).toBe(false)
	})

	it("clears error when payload is null", () => {
		const state = createState({ error: "previous error" })
		const result = reducer(state, { type: "SET_ERROR", payload: null })

		expect(result.error).toBeNull()
	})
})

describe("NotesReducer - GO_BACK", () => {
	it("returns to group step and clears selectedGroup/notes", () => {
		const group = createRegistration()
		const state = createState({
			step: "edit",
			selectedGroup: group,
			notes: "some notes",
		})
		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("group")
		expect(result.selectedGroup).toBeNull()
		expect(result.notes).toBe("")
	})
})

describe("NotesReducer - RESET", () => {
	it("preserves clubEvent but clears all other state, increments resetKey", () => {
		const event = createEvent({ id: 99 })
		const group = createRegistration()
		const state = createState({
			clubEvent: event,
			selectedGroup: group,
			notes: "notes",
			step: "edit",
			isLoading: false,
			isProcessing: true,
			error: "error",
			success: true,
			resetKey: 5,
		})
		const result = reducer(state, { type: "RESET" })

		expect(result.clubEvent).toBe(event)
		expect(result.selectedGroup).toBeNull()
		expect(result.notes).toBe("")
		expect(result.step).toBe("group")
		expect(result.isLoading).toBe(false)
		expect(result.isProcessing).toBe(false)
		expect(result.error).toBeNull()
		expect(result.success).toBe(false)
		expect(result.resetKey).toBe(6)
	})
})
