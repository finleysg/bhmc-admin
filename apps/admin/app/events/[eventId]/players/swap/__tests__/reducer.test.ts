import { reducer, initialState, type SwapPlayerState } from "../reducer"
import type {
	CompleteClubEvent,
	CompleteRegistration,
	CompleteRegistrationSlot,
	Player,
} from "@repo/domain/types"
import { RegistrationStatusChoices } from "@repo/domain/types"

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

const createRegistration = (
	overrides: Partial<CompleteRegistration> = {},
): CompleteRegistration => ({
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

const createSlot = (
	overrides: Partial<CompleteRegistrationSlot> = {},
): CompleteRegistrationSlot => ({
	id: overrides.id ?? 1,
	registrationId: overrides.registrationId ?? 10,
	eventId: overrides.eventId ?? 1,
	startingOrder: overrides.startingOrder ?? 1,
	slot: overrides.slot ?? 1,
	status: overrides.status ?? RegistrationStatusChoices.RESERVED,
	holeId: overrides.holeId ?? HOLE_ID,
	playerId: overrides.playerId ?? 1,
	player: overrides.player ?? createPlayer({ id: overrides.playerId ?? 1 }),
	hole: overrides.hole ?? { id: HOLE_ID, courseId: COURSE_ID, holeNumber: 1, par: 4 },
	fees: overrides.fees ?? [],
	...overrides,
})

const createState = (overrides: Partial<SwapPlayerState> = {}): SwapPlayerState => ({
	...initialState,
	...overrides,
})

describe("SwapPlayerReducer - SET_EVENT", () => {
	it("stores club event", () => {
		const event = createEvent()
		const result = reducer(initialState, { type: "SET_EVENT", payload: event })

		expect(result.clubEvent).toBe(event)
		expect(result.isLoading).toBe(false)
	})
})

describe("SwapPlayerReducer - SET_PLAYER_A", () => {
	it("advances to playerB step and stores groupA, playerA, slotA", () => {
		const group = createRegistration({ id: 100 })
		const player = createPlayer({ id: 1 })
		const slot = createSlot({ id: 10, playerId: 1, registrationId: 100 })
		const state = createState({ step: "playerA" })

		const result = reducer(state, {
			type: "SET_PLAYER_A",
			payload: { group, player, slot },
		})

		expect(result.groupA).toBe(group)
		expect(result.playerA).toBe(player)
		expect(result.slotA).toBe(slot)
		expect(result.step).toBe("playerB")
	})
})

describe("SwapPlayerReducer - SET_PLAYER_B", () => {
	it("advances to confirm step and stores groupB, playerB, slotB", () => {
		const group = createRegistration({ id: 200 })
		const player = createPlayer({ id: 2 })
		const slot = createSlot({ id: 20, playerId: 2, registrationId: 200 })
		const state = createState({ step: "playerB" })

		const result = reducer(state, {
			type: "SET_PLAYER_B",
			payload: { group, player, slot },
		})

		expect(result.groupB).toBe(group)
		expect(result.playerB).toBe(player)
		expect(result.slotB).toBe(slot)
		expect(result.step).toBe("confirm")
	})
})

describe("SwapPlayerReducer - GO_BACK", () => {
	it("reverses from playerB to playerA and clears groupA, playerA, slotA", () => {
		const groupA = createRegistration({ id: 100 })
		const playerA = createPlayer({ id: 1 })
		const slotA = createSlot({ id: 10 })
		const state = createState({
			step: "playerB",
			groupA,
			playerA,
			slotA,
		})

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("playerA")
		expect(result.groupA).toBeNull()
		expect(result.playerA).toBeNull()
		expect(result.slotA).toBeNull()
	})

	it("reverses from confirm to playerB and clears groupB, playerB, slotB, notes", () => {
		const groupB = createRegistration({ id: 200 })
		const playerB = createPlayer({ id: 2 })
		const slotB = createSlot({ id: 20 })
		const state = createState({
			step: "confirm",
			groupB,
			playerB,
			slotB,
			notes: "some notes",
		})

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("playerB")
		expect(result.groupB).toBeNull()
		expect(result.playerB).toBeNull()
		expect(result.slotB).toBeNull()
		expect(result.notes).toBe("")
	})

	it("does not change step when already at playerA", () => {
		const state = createState({ step: "playerA" })

		const result = reducer(state, { type: "GO_BACK" })

		expect(result.step).toBe("playerA")
	})
})

describe("SwapPlayerReducer - RESET", () => {
	it("preserves clubEvent but clears all player selections", () => {
		const event = createEvent()
		const groupA = createRegistration({ id: 100 })
		const playerA = createPlayer({ id: 1 })
		const slotA = createSlot({ id: 10 })
		const groupB = createRegistration({ id: 200 })
		const playerB = createPlayer({ id: 2 })
		const slotB = createSlot({ id: 20 })
		const state = createState({
			clubEvent: event,
			groupA,
			playerA,
			slotA,
			groupB,
			playerB,
			slotB,
			notes: "test notes",
			step: "confirm",
			isLoading: false,
			isProcessing: true,
			error: "some error",
			swapSuccess: true,
			resetKey: 5,
		})

		const result = reducer(state, { type: "RESET" })

		expect(result.clubEvent).toBe(event)
		expect(result.isLoading).toBe(false)
		expect(result.resetKey).toBe(6)
		expect(result.groupA).toBeNull()
		expect(result.playerA).toBeNull()
		expect(result.slotA).toBeNull()
		expect(result.groupB).toBeNull()
		expect(result.playerB).toBeNull()
		expect(result.slotB).toBeNull()
		expect(result.notes).toBe("")
		expect(result.step).toBe("playerA")
		expect(result.isProcessing).toBe(false)
		expect(result.error).toBeNull()
		expect(result.swapSuccess).toBe(false)
	})
})

describe("SwapPlayerReducer - other actions", () => {
	it("SET_NOTES stores notes", () => {
		const result = reducer(initialState, { type: "SET_NOTES", payload: "test notes" })

		expect(result.notes).toBe("test notes")
	})

	it("SET_PROCESSING updates isProcessing", () => {
		const result = reducer(initialState, { type: "SET_PROCESSING", payload: true })

		expect(result.isProcessing).toBe(true)
	})

	it("SET_SUCCESS updates swapSuccess and clears processing and error", () => {
		const state = createState({
			isProcessing: true,
			error: "Previous error",
		})

		const result = reducer(state, { type: "SET_SUCCESS", payload: true })

		expect(result.swapSuccess).toBe(true)
		expect(result.isProcessing).toBe(false)
		expect(result.error).toBeNull()
	})

	it("SET_ERROR updates error and clears processing", () => {
		const state = createState({ isProcessing: true })

		const result = reducer(state, { type: "SET_ERROR", payload: "test error" })

		expect(result.error).toBe("test error")
		expect(result.isProcessing).toBe(false)
	})
})
