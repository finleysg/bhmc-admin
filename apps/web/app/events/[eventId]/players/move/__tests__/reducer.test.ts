import { reducer, initialState, type MovePlayerState } from "../reducer"
import type {
	CompleteClubEvent,
	Player,
	Registration,
	RegistrationSlot,
	AvailableSlotGroup,
} from "@repo/domain/types"

const HOLE_ID = 101
const COURSE_ID = 10

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
	id: overrides.id ?? 1,
	firstName: overrides.firstName ?? "Test",
	lastName: overrides.lastName ?? "Player",
	email: overrides.email ?? `player${overrides.id ?? 1}@example.com`,
	tee: overrides.tee ?? "Championship",
	isMember: overrides.isMember ?? true,
	userId: overrides.userId ?? 42,
	...overrides,
})

const createEvent = (overrides: Partial<CompleteClubEvent> = {}): CompleteClubEvent => ({
	id: overrides.id ?? 1,
	eventType: overrides.eventType ?? "N",
	name: overrides.name ?? "Test Event",
	rounds: overrides.rounds ?? null,
	registrationType: overrides.registrationType ?? "M",
	skinsType: overrides.skinsType ?? "N",
	minimumSignupGroupSize: overrides.minimumSignupGroupSize ?? 1,
	maximumSignupGroupSize: overrides.maximumSignupGroupSize ?? 4,
	groupSize: overrides.groupSize ?? 4,
	totalGroups: overrides.totalGroups ?? 10,
	startType: overrides.startType ?? "TT",
	canChoose: overrides.canChoose ?? true,
	ghinRequired: overrides.ghinRequired ?? false,
	seasonPoints: overrides.seasonPoints ?? null,
	notes: overrides.notes ?? null,
	startDate: overrides.startDate ?? "2024-01-01",
	startTime: overrides.startTime ?? null,
	signupStart: overrides.signupStart ?? null,
	signupEnd: overrides.signupEnd ?? null,
	paymentsEnd: overrides.paymentsEnd ?? null,
	registrationMaximum: overrides.registrationMaximum ?? null,
	portalUrl: overrides.portalUrl ?? null,
	externalUrl: overrides.externalUrl ?? null,
	status: overrides.status ?? "S",
	season: overrides.season ?? 2024,
	teeTimeSplits: overrides.teeTimeSplits ?? null,
	starterTimeInterval: overrides.starterTimeInterval ?? 10,
	teamSize: overrides.teamSize ?? 1,
	prioritySignupStart: overrides.prioritySignupStart ?? null,
	signupWaves: overrides.signupWaves ?? null,
	ageRestriction: overrides.ageRestriction ?? null,
	ageRestrictionType: overrides.ageRestrictionType ?? "N",
	ggId: overrides.ggId ?? "GG-1",
	eventRounds: overrides.eventRounds ?? [],
	tournaments: overrides.tournaments ?? [],
	eventFees: overrides.eventFees ?? [],
	courses: overrides.courses ?? [
		{
			id: COURSE_ID,
			name: "Test Course",
			numberOfHoles: 18,
			ggId: "course",
			holes: [{ id: HOLE_ID, courseId: COURSE_ID, holeNumber: 1, par: 4 }],
			tees: [],
		},
	],
	...overrides,
})

const createRegistration = (overrides: Partial<Registration> = {}): Registration => ({
	id: overrides.id ?? 10,
	eventId: overrides.eventId ?? 1,
	courseId: overrides.courseId ?? COURSE_ID,
	signedUpBy: overrides.signedUpBy ?? "Admin",
	userId: overrides.userId ?? 1,
	createdDate: overrides.createdDate ?? Date.now().toString(),
	notes: overrides.notes ?? null,
	slots: overrides.slots ?? [],
	expires: overrides.expires ?? null,
	ggId: overrides.ggId ?? null,
	...overrides,
})

const createSlot = (overrides: Partial<RegistrationSlot> = {}): RegistrationSlot => ({
	id: overrides.id ?? 1,
	registrationId: overrides.registrationId ?? 10,
	eventId: overrides.eventId ?? 1,
	startingOrder: overrides.startingOrder ?? 1,
	slot: overrides.slot ?? 1,
	status: overrides.status ?? "R",
	holeId: overrides.holeId ?? HOLE_ID,
	playerId: overrides.playerId,
	player: overrides.player,
	...overrides,
})

const createSlotGroup = (overrides: Partial<AvailableSlotGroup> = {}): AvailableSlotGroup => ({
	holeId: overrides.holeId ?? HOLE_ID,
	holeNumber: overrides.holeNumber ?? 1,
	startingOrder: overrides.startingOrder ?? 1,
	slots: overrides.slots ?? [createSlot()],
})

const createState = (overrides: Partial<MovePlayerState> = {}): MovePlayerState => ({
	...initialState,
	...overrides,
})

describe("MovePlayerReducer - SET_EVENT", () => {
	it("stores club event", () => {
		const event = createEvent()
		const result = reducer(initialState, { type: "SET_EVENT", payload: event })

		expect(result.clubEvent).toBe(event)
		expect(result.isLoading).toBe(false)
	})
})

describe("MovePlayerReducer - SET_GROUP", () => {
	it("advances to player step and stores group", () => {
		const registration = createRegistration()
		const state = createState({ step: "group" })

		const result = reducer(state, { type: "SET_GROUP", payload: registration })

		expect(result.sourceGroup).toBe(registration)
		expect(result.step).toBe("player")
	})
})

describe("MovePlayerReducer - SELECT_PLAYER/REMOVE_PLAYER", () => {
	it("SELECT_PLAYER adds player and slot to arrays", () => {
		const player = createPlayer({ id: 1 })
		const slot = createSlot({ id: 10, playerId: 1 })
		const state = createState()

		const result = reducer(state, {
			type: "SELECT_PLAYER",
			payload: { player, slot },
		})

		expect(result.selectedPlayers).toEqual([player])
		expect(result.selectedSourceSlots).toEqual([slot])
	})

	it("SELECT_PLAYER appends to existing selections", () => {
		const player1 = createPlayer({ id: 1 })
		const slot1 = createSlot({ id: 10, playerId: 1 })
		const player2 = createPlayer({ id: 2 })
		const slot2 = createSlot({ id: 11, playerId: 2 })
		const state = createState({
			selectedPlayers: [player1],
			selectedSourceSlots: [slot1],
		})

		const result = reducer(state, {
			type: "SELECT_PLAYER",
			payload: { player: player2, slot: slot2 },
		})

		expect(result.selectedPlayers).toEqual([player1, player2])
		expect(result.selectedSourceSlots).toEqual([slot1, slot2])
	})

	it("REMOVE_PLAYER filters out player and slot by playerId", () => {
		const player1 = createPlayer({ id: 1 })
		const slot1 = createSlot({ id: 10, playerId: 1 })
		const player2 = createPlayer({ id: 2 })
		const slot2 = createSlot({ id: 11, playerId: 2 })
		const state = createState({
			selectedPlayers: [player1, player2],
			selectedSourceSlots: [slot1, slot2],
		})

		const result = reducer(state, { type: "REMOVE_PLAYER", payload: 1 })

		expect(result.selectedPlayers).toEqual([player2])
		expect(result.selectedSourceSlots).toEqual([slot2])
	})

	it("REMOVE_PLAYER handles empty result", () => {
		const player = createPlayer({ id: 1 })
		const slot = createSlot({ id: 10, playerId: 1 })
		const state = createState({
			selectedPlayers: [player],
			selectedSourceSlots: [slot],
		})

		const result = reducer(state, { type: "REMOVE_PLAYER", payload: 1 })

		expect(result.selectedPlayers).toEqual([])
		expect(result.selectedSourceSlots).toEqual([])
	})
})

describe("MovePlayerReducer - GO_BACK", () => {
	it("reverses from player to group and clears group data", () => {
		const registration = createRegistration()
		const player = createPlayer()
		const slot = createSlot()
		const state = createState({
			step: "player",
			sourceGroup: registration,
			selectedPlayers: [player],
			selectedSourceSlots: [slot],
		})

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("group")
		expect(result.sourceGroup).toBeNull()
		expect(result.selectedPlayers).toEqual([])
		expect(result.selectedSourceSlots).toEqual([])
	})

	it("reverses from destination to player and clears selections", () => {
		const player = createPlayer()
		const slot = createSlot()
		const state = createState({
			step: "destination",
			selectedPlayers: [player],
			selectedSourceSlots: [slot],
			destinationCourseId: COURSE_ID,
			destinationSlotGroup: createSlotGroup(),
		})

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("player")
		expect(result.selectedPlayers).toEqual([])
		expect(result.selectedSourceSlots).toEqual([])
		expect(result.destinationCourseId).toBeNull()
		expect(result.destinationSlotGroup).toBeNull()
	})

	it("reverses from confirm to destination and clears notes", () => {
		const slotGroup = createSlotGroup()
		const state = createState({
			step: "confirm",
			destinationSlotGroup: slotGroup,
			notes: "some notes",
		})

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("destination")
		expect(result.destinationSlotGroup).toBeNull()
		expect(result.notes).toBe("")
	})

	it("does not change step when already at group", () => {
		const state = createState({ step: "group" })

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("group")
	})
})

describe("MovePlayerReducer - RESET", () => {
	it("preserves clubEvent but clears selections", () => {
		const event = createEvent()
		const registration = createRegistration()
		const player = createPlayer()
		const slot = createSlot()
		const slotGroup = createSlotGroup()
		const state = createState({
			clubEvent: event,
			sourceGroup: registration,
			selectedPlayers: [player],
			selectedSourceSlots: [slot],
			destinationCourseId: COURSE_ID,
			destinationSlotGroup: slotGroup,
			notes: "test notes",
			step: "confirm",
			isLoading: false,
			error: "some error",
			moveSuccess: true,
			resetKey: 5,
		})

		const result = reducer(state, { type: "RESET" })

		expect(result.clubEvent).toBe(event)
		expect(result.isLoading).toBe(false)
		expect(result.resetKey).toBe(6)
		expect(result.sourceGroup).toBeNull()
		expect(result.selectedPlayers).toEqual([])
		expect(result.selectedSourceSlots).toEqual([])
		expect(result.destinationCourseId).toBeNull()
		expect(result.destinationSlotGroup).toBeNull()
		expect(result.notes).toBe("")
		expect(result.step).toBe("group")
		expect(result.error).toBeNull()
		expect(result.moveSuccess).toBe(false)
	})
})

describe("MovePlayerReducer - other actions", () => {
	it("SET_DESTINATION_COURSE stores courseId and clears slot group", () => {
		const state = createState({ destinationSlotGroup: createSlotGroup() })

		const result = reducer(state, { type: "SET_DESTINATION_COURSE", payload: COURSE_ID })

		expect(result.destinationCourseId).toBe(COURSE_ID)
		expect(result.destinationSlotGroup).toBeNull()
	})

	it("SET_DESTINATION_SLOTS stores slot group and advances to confirm", () => {
		const slotGroup = createSlotGroup()
		const state = createState({ step: "destination" })

		const result = reducer(state, { type: "SET_DESTINATION_SLOTS", payload: slotGroup })

		expect(result.destinationSlotGroup).toBe(slotGroup)
		expect(result.step).toBe("confirm")
	})

	it("SET_NOTES stores notes", () => {
		const result = reducer(initialState, { type: "SET_NOTES", payload: "test notes" })

		expect(result.notes).toBe("test notes")
	})

	it("SET_PROCESSING updates isProcessing", () => {
		const result = reducer(initialState, { type: "SET_PROCESSING", payload: true })

		expect(result.isProcessing).toBe(true)
	})

	it("SET_SUCCESS updates moveSuccess and clears processing", () => {
		const state = createState({ isProcessing: true })

		const result = reducer(state, { type: "SET_SUCCESS", payload: true })

		expect(result.moveSuccess).toBe(true)
		expect(result.isProcessing).toBe(false)
	})

	it("SET_ERROR updates error and clears processing", () => {
		const state = createState({ isProcessing: true })

		const result = reducer(state, { type: "SET_ERROR", payload: "test error" })

		expect(result.error).toBe("test error")
		expect(result.isProcessing).toBe(false)
	})
})
