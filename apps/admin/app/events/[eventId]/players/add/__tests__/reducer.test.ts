import {
	reducer,
	getInitialState,
	generateAdminRegistration,
	type AddPlayerState,
} from "../reducer"
import {
	RegistrationStatusChoices,
	type AdminRegistration,
	type AvailableSlotGroup,
	type CompleteClubEvent,
	type Player,
	type RegistrationSlot,
} from "@repo/domain/types"

const HOLE_ID = 101
const COURSE_ID = 10
const EVENT_FEE_ID = 201
const SECOND_FEE_ID = 202

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

const createCompleteEvent = (overrides: Partial<CompleteClubEvent> = {}): CompleteClubEvent => ({
	id: overrides.id ?? 1,
	eventType: overrides.eventType ?? "N",
	name: overrides.name ?? "Event",
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
	eventFees: overrides.eventFees ?? [
		{
			id: EVENT_FEE_ID,
			eventId: overrides.id ?? 1,
			amount: 50,
			isRequired: false,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: {
				id: 1,
				name: "Entry",
				code: "ENT",
				payout: "Cash",
				restriction: "None",
			},
		},
		{
			id: SECOND_FEE_ID,
			eventId: overrides.id ?? 1,
			amount: 25,
			isRequired: false,
			displayOrder: 2,
			feeTypeId: 2,
			feeType: {
				id: 2,
				name: "Skins",
				code: "SKN",
				payout: "Cash",
				restriction: "None",
			},
		},
	],
	courses: overrides.courses ?? [
		{
			id: COURSE_ID,
			name: "Course",
			numberOfHoles: 18,
			ggId: "course",
			holes: [{ id: HOLE_ID, courseId: COURSE_ID, holeNumber: 1, par: 4 }],
			tees: [],
		},
	],
	...overrides,
})

const createRegistrationSlot = (overrides: Partial<RegistrationSlot> = {}): RegistrationSlot => ({
	id: overrides.id ?? 1,
	registrationId: overrides.registrationId ?? 10,
	eventId: overrides.eventId ?? 1,
	startingOrder: overrides.startingOrder ?? 1,
	slot: overrides.slot ?? 1,
	status: overrides.status ?? RegistrationStatusChoices.AVAILABLE,
	holeId: overrides.holeId ?? HOLE_ID,
	playerId: overrides.playerId,
	player: overrides.player,
	...overrides,
})

const createSlotGroup = (
	overrides: Partial<AvailableSlotGroup> = {},
	slots: RegistrationSlot[] = [createRegistrationSlot()],
): AvailableSlotGroup => ({
	holeId: overrides.holeId ?? HOLE_ID,
	holeNumber: overrides.holeNumber ?? 1,
	startingOrder: overrides.startingOrder ?? 1,
	slots: overrides.slots ?? slots,
})

const createState = (overrides: Partial<AddPlayerState> = {}): AddPlayerState => ({
	...getInitialState(),
	...overrides,
})

const expectRegistration = (registration: AdminRegistration | null): AdminRegistration => {
	if (!registration) {
		throw new Error("expected admin registration")
	}
	return registration
}

describe("AddPlayerReducer - SET actions", () => {
	it("SET_EVENT stores event and regenerates registration when ready", () => {
		const player = createPlayer()
		const slotGroup = createSlotGroup({
			holeId: HOLE_ID + 1,
			slots: [createRegistrationSlot({ id: 11 })],
		})
		const readyState = createState({
			event: createCompleteEvent(),
			selectedPlayers: [player],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			selectedFees: [{ playerId: player.id, eventFeeId: EVENT_FEE_ID }],
			canSelectGroup: true,
			canSelectFees: true,
			canCompleteRegistration: true,
		})
		const newEvent = createCompleteEvent({
			id: 2,
			courses: [
				{
					id: 99,
					name: "New Course",
					numberOfHoles: 9,
					ggId: "new-course",
					holes: [{ id: HOLE_ID + 1, courseId: 99, holeNumber: 1, par: 3 }],
					tees: [],
				},
			],
		})

		const result = reducer(readyState, { type: "SET_EVENT", payload: newEvent })

		expect(result.event).toBe(newEvent)
		const registration = expectRegistration(result.adminRegistration)
		expect(registration.courseId).toBe(99)
	})

	it("SET_ERROR handles Error instance", () => {
		const error = new Error("boom")
		const result = reducer(getInitialState(), { type: "SET_ERROR", payload: error })
		expect(result.error).toBe("boom")
	})

	it("SET_ERROR handles string payload", () => {
		const result = reducer(getInitialState(), { type: "SET_ERROR", payload: "fail" })
		expect(result.error).toBe("fail")
	})

	it("SET_ERROR handles object payload", () => {
		const payload = { message: "oops" }
		const result = reducer(getInitialState(), { type: "SET_ERROR", payload })
		expect(result.error).toBe(JSON.stringify(payload))
	})
})

describe("choosable events", () => {
	it("ADD_PLAYER appends players and enables group selection", () => {
		const event = createCompleteEvent({ canChoose: true })
		const player = createPlayer()

		const result = reducer(createState({ event }), { type: "ADD_PLAYER", payload: player })

		expect(result.selectedPlayers).toEqual([player])
		expect(result.canSelectGroup).toBe(true)
		expect(result.canCompleteRegistration).toBe(false)
	})

	it("REMOVE_PLAYER removes player and updates registration", () => {
		const player1 = createPlayer({ id: 1, email: "a" })
		const player2 = createPlayer({ id: 2, email: "b" })
		const slotGroup = createSlotGroup({
			slots: [createRegistrationSlot({ id: 1 }), createRegistrationSlot({ id: 2 })],
		})
		const state = createState({
			event: createCompleteEvent({ canChoose: true }),
			selectedPlayers: [player1, player2],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			canSelectGroup: true,
			canSelectFees: true,
			canCompleteRegistration: true,
		})

		const result = reducer(state, { type: "REMOVE_PLAYER", payload: player1 })

		expect(result.selectedPlayers).toEqual([player2])
		expect(result.canSelectGroup).toBe(true)
	})

	it("SELECT_SLOTS updates group and enables fees & completion", () => {
		const player = createPlayer()
		const event = createCompleteEvent({ canChoose: true })
		const slotGroup = createSlotGroup({ slots: [createRegistrationSlot({ id: 5 })] })

		const result = reducer(createState({ event, selectedPlayers: [player], signedUpBy: "Admin" }), {
			type: "SELECT_SLOTS",
			payload: { slotIds: [5], group: slotGroup },
		})

		expect(result.selectedSlotGroup).toEqual(slotGroup)
		expect(result.canSelectFees).toBe(true)
		expect(result.canCompleteRegistration).toBe(true)
	})

	it("SET_FEES stores selected fees and keeps registration", () => {
		const player = createPlayer({ id: 7 })
		const slotGroup = createSlotGroup({ slots: [createRegistrationSlot({ id: 77 })] })
		const state = createState({
			event: createCompleteEvent({ canChoose: true }),
			selectedPlayers: [player],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			canSelectGroup: true,
			canSelectFees: true,
			canCompleteRegistration: true,
		})
		const fees = [
			{ playerId: player.id, eventFeeId: EVENT_FEE_ID },
			{ playerId: player.id, eventFeeId: SECOND_FEE_ID },
		]

		const result = reducer(state, { type: "SET_FEES", payload: fees })

		expect(result.selectedFees).toEqual(fees)
		const registration = expectRegistration(result.adminRegistration)
		expect(registration.slots[0].feeIds).toEqual([EVENT_FEE_ID, SECOND_FEE_ID])
	})
})

describe("non-choosable events", () => {
	it("ADD_PLAYER creates synthetic slots and registration", () => {
		const player = createPlayer({ id: 3 })
		const event = createCompleteEvent({ canChoose: false })

		const result = reducer(createState({ event }), { type: "ADD_PLAYER", payload: player })

		expect(result.selectedSlotGroup?.slots).toHaveLength(1)
		expect(result.selectedSlotGroup?.slots[0].playerId).toBe(player.id)
		expect(result.canSelectFees).toBe(true)
		expect(result.canCompleteRegistration).toBe(true)
		const registration = expectRegistration(result.adminRegistration)
		expect(registration.slots[0].playerId).toBe(player.id)
	})

	it("REMOVE_PLAYER clears synthetic slot and disables completion", () => {
		const player = createPlayer({ id: 4 })
		const slot = createRegistrationSlot({ id: 1, playerId: player.id })
		const state = createState({
			event: createCompleteEvent({ canChoose: false }),
			selectedPlayers: [player],
			selectedSlotGroup: createSlotGroup({ slots: [slot] }),
			canCompleteRegistration: true,
			canSelectFees: true,
		})

		const result = reducer(state, { type: "REMOVE_PLAYER", payload: player })

		expect(result.selectedPlayers).toEqual([])
		expect(result.selectedSlotGroup).toBeNull()
		expect(result.canCompleteRegistration).toBe(false)
		expect(result.adminRegistration).toBeNull()
	})

	it("SET_FEES keeps completion flag when players exist", () => {
		const player = createPlayer()
		const slot = createRegistrationSlot({ id: 1, playerId: player.id })
		const state = createState({
			event: createCompleteEvent({ canChoose: false }),
			selectedPlayers: [player],
			selectedSlotGroup: createSlotGroup({ slots: [slot] }),
			canCompleteRegistration: true,
		})

		const result = reducer(state, {
			type: "SET_FEES",
			payload: [{ playerId: player.id, eventFeeId: EVENT_FEE_ID }],
		})

		expect(result.selectedFees).toHaveLength(1)
		expect(result.canCompleteRegistration).toBe(true)
	})
})

describe("generateAdminRegistration", () => {
	it("returns null when canCompleteRegistration is false", () => {
		expect(generateAdminRegistration(getInitialState())).toBeNull()
	})

	it("derives courseId from selected slot group hole", () => {
		const player = createPlayer()
		const slotGroup = createSlotGroup()
		const state = createState({
			event: createCompleteEvent(),
			selectedPlayers: [player],
			selectedSlotGroup: slotGroup,
			selectedFees: [{ playerId: player.id, eventFeeId: EVENT_FEE_ID }],
			signedUpBy: "Admin",
			canCompleteRegistration: true,
		})

		const registration = expectRegistration(generateAdminRegistration(state))
		expect(registration.courseId).toBe(COURSE_ID)
	})

	it("limits players to available slots", () => {
		const player1 = createPlayer({ id: 1 })
		const player2 = createPlayer({ id: 2 })
		const slotGroup = createSlotGroup({ slots: [createRegistrationSlot({ id: 1 })] })
		const state = createState({
			event: createCompleteEvent(),
			selectedPlayers: [player1, player2],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			canCompleteRegistration: true,
		})

		const registration = expectRegistration(generateAdminRegistration(state))
		expect(registration.slots).toHaveLength(1)
		expect(registration.slots[0].playerId).toBe(player1.id)
	})
})

describe("UI flag calculations", () => {
	it("canSelectFees becomes true once slots selected for choosable event", () => {
		const player = createPlayer()
		const event = createCompleteEvent({ canChoose: true })
		const slotGroup = createSlotGroup()

		const result = reducer(createState({ event, selectedPlayers: [player] }), {
			type: "SELECT_SLOTS",
			payload: { slotIds: [1], group: slotGroup },
		})

		expect(result.canSelectFees).toBe(true)
		expect(result.adminRegistration).not.toBeNull()
	})

	it("non-choosable events allow fees once players exist", () => {
		const event = createCompleteEvent({ canChoose: false })
		const player = createPlayer()

		const result = reducer(createState({ event }), { type: "ADD_PLAYER", payload: player })

		expect(result.canSelectFees).toBe(true)
	})

	it("canCompleteRegistration requires both players and slots", () => {
		const player = createPlayer()
		const slotGroup = createSlotGroup()
		const ready = createState({
			event: createCompleteEvent({ canChoose: true }),
			selectedPlayers: [player],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			canCompleteRegistration: true,
		})

		const result = reducer(ready, { type: "REMOVE_PLAYER", payload: player })

		expect(result.canCompleteRegistration).toBe(false)
		expect(result.adminRegistration).toBeNull()
	})
})

describe("SET_REGISTRATION_OPTIONS", () => {
	it("updates options and regenerates admin registration", () => {
		const player = createPlayer()
		const slotGroup = createSlotGroup()
		const state = createState({
			event: createCompleteEvent(),
			selectedPlayers: [player],
			selectedSlotGroup: slotGroup,
			signedUpBy: "Admin",
			canCompleteRegistration: true,
		})

		const options = { expires: 12, sendPaymentRequest: false, notes: "memo" }
		const result = reducer(state, { type: "SET_REGISTRATION_OPTIONS", payload: options })

		const registration = expectRegistration(result.adminRegistration)
		expect(registration.collectPayment).toBe(false)
		expect(registration.expires).toBe(12)
		expect(result.registrationOptions).toEqual(options)
	})
})
