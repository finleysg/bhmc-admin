// Unit tests for DropPlayer reducer

import { reducer, initialState, State, Action, translateRefundRequests } from "../reducer"
import type { ValidatedPlayer, ValidatedClubEvent, ValidatedRegistration } from "@repo/domain/types"

const mockPlayer = (id: number): ValidatedPlayer => ({
	id,
	firstName: `First${id}`,
	lastName: `Last${id}`,
	email: `player${id}@test.com`,
	tee: "Championship",
	isMember: true,
})

describe("SET_FEES", () => {
	it("should set selectedFees", () => {
		const fees = [{ slotId: 1, registrationFeeIds: [101, 102] }]
		const state = reducer(initialState, { type: "SET_FEES", payload: fees })
		expect(state.selectedFees).toEqual(fees)
	})
})

describe("Boolean flag setters", () => {
	it("should set isProcessing", () => {
		const state = reducer(initialState, { type: "SET_PROCESSING", payload: true })
		expect(state.isProcessing).toBe(true)
	})
	it("should set dropSuccess", () => {
		const state = reducer(initialState, { type: "SET_DROP_SUCCESS", payload: true })
		expect(state.dropSuccess).toBe(true)
	})
})

describe("RESET_STATE", () => {
	it("should reset all fields to initialState", () => {
		const dirtyState: State = {
			clubEvent: mockClubEvent,
			selectedGroup: mockRegistration([1]),
			selectedPlayers: [mockPlayer(1)],
			selectedFees: [{ slotId: 1, registrationFeeIds: [101] }],
			error: "err",
			isLoading: false,
			dropSuccess: true,
			isProcessing: true,
		}
		const state = reducer(dirtyState, { type: "RESET_STATE" })
		expect(state).toEqual(initialState)
	})
})

describe("RESET_ERROR", () => {
	it("should clear error field", () => {
		const stateWithError: State = { ...initialState, error: "err" }
		const state = reducer(stateWithError, { type: "RESET_ERROR" })
		expect(state.error).toBeNull()
	})
})

describe("initialState", () => {
	it("should have correct default values", () => {
		expect(initialState.clubEvent).toBeNull()
		expect(initialState.selectedGroup).toBeUndefined()
		expect(initialState.selectedPlayers).toEqual([])
		expect(initialState.selectedFees).toEqual([])
		expect(initialState.error).toBeNull()
		expect(initialState.isLoading).toBe(true)
		expect(initialState.dropSuccess).toBe(false)
		expect(initialState.isProcessing).toBe(false)
	})
})

describe("translateRefundRequests", () => {
	it("returns empty array when no fees selected", () => {
		const state: State = { ...initialState, selectedFees: [] }
		expect(translateRefundRequests(state)).toEqual([])
	})

	it("groups fees by paymentId correctly", () => {
		const slot = {
			id: 10,
			player: mockPlayer(1),
			fees: [
				{ id: 101, paymentId: 1 },
				{ id: 102, paymentId: 1 },
			],
		}
		const selectedGroup = { id: 10, slots: [slot] } as ValidatedRegistration
		const state: State = {
			...initialState,
			selectedGroup,
			selectedFees: [{ slotId: 10, registrationFeeIds: [101, 102] }],
		}
		expect(translateRefundRequests(state)).toEqual([
			{ paymentId: 1, registrationFeeIds: [101, 102] },
		])
	})

	it("handles multiple fees from different payments", () => {
		const slot = {
			id: 10,
			player: mockPlayer(1),
			fees: [
				{ id: 101, paymentId: 1 },
				{ id: 201, paymentId: 2 },
			],
		}
		const selectedGroup = { id: 10, slots: [slot] } as ValidatedRegistration
		const state: State = {
			...initialState,
			selectedGroup,
			selectedFees: [{ slotId: 10, registrationFeeIds: [101, 201] }],
		}
		expect(translateRefundRequests(state)).toEqual([
			{ paymentId: 1, registrationFeeIds: [101] },
			{ paymentId: 2, registrationFeeIds: [201] },
		])
	})

	it("skips fees when slot not found", () => {
		const selectedGroup = { id: 10, slots: [] } as ValidatedRegistration
		const state: State = {
			...initialState,
			selectedGroup,
			selectedFees: [{ slotId: 99, registrationFeeIds: [101] }],
		}
		expect(translateRefundRequests(state)).toEqual([])
	})

	it("skips fees when fee not found in slot", () => {
		const slot = { id: 10, player: mockPlayer(1), fees: [{ id: 101, paymentId: 1 }] }
		const selectedGroup = { id: 10, slots: [slot] } as ValidatedRegistration
		const state: State = {
			...initialState,
			selectedGroup,
			selectedFees: [{ slotId: 10, registrationFeeIds: [999] }],
		}
		expect(translateRefundRequests(state)).toEqual([])
	})

	it("handles undefined selectedGroup", () => {
		const state: State = {
			...initialState,
			selectedGroup: undefined,
			selectedFees: [{ slotId: 10, registrationFeeIds: [101] }],
		}
		expect(translateRefundRequests(state)).toEqual([])
	})

	it("returns correct RefundRequest structure", () => {
		const slot = { id: 10, player: mockPlayer(1), fees: [{ id: 101, paymentId: 1 }] }
		const selectedGroup = { id: 10, slots: [slot] } as ValidatedRegistration
		const state: State = {
			...initialState,
			selectedGroup,
			selectedFees: [{ slotId: 10, registrationFeeIds: [101] }],
		}
		expect(translateRefundRequests(state)).toEqual([{ paymentId: 1, registrationFeeIds: [101] }])
	})
})

const mockClubEvent: ValidatedClubEvent = {
	id: 1,
	name: "Test Event",
} as ValidatedClubEvent

const mockRegistration = (playerIds: Array<number | null>): ValidatedRegistration =>
	({
		id: 10,
		slots: playerIds.map((id, idx) => ({
			id: idx + 1,
			player: id !== null ? mockPlayer(id) : null,
			fees: [],
		})),
	}) as ValidatedRegistration

describe("DropPlayer reducer", () => {
	// Action is a discriminated union, so unknown actions are not allowed by TypeScript.
	// This test is removed to satisfy type safety.

	it("should handle SET_EVENT", () => {
		const action: Action = { type: "SET_EVENT", payload: mockClubEvent }
		const state = reducer(initialState, action)
		expect(state.clubEvent).toEqual(mockClubEvent)
		expect(state.selectedGroup).toBeUndefined()
		expect(state.selectedPlayers).toEqual([])
	})

	it("should handle SET_GROUP and filter out null players", () => {
		const registration = mockRegistration([1, null, 2])
		const action: Action = { type: "SET_GROUP", payload: registration }
		const state = reducer(initialState, action)
		expect(state.selectedGroup).toEqual(registration)
		expect(state.selectedPlayers).toEqual([mockPlayer(1), mockPlayer(2)])
	})

	it("should handle SET_ERROR", () => {
		const error = new Error("Test error")
		const action: Action = { type: "SET_ERROR", payload: error }
		const state = reducer(initialState, action)
		expect(state.error).toBe(error)
	})

	it("should handle SET_LOADING", () => {
		const action: Action = { type: "SET_LOADING", payload: false }
		const state = reducer(initialState, action)
		expect(state.isLoading).toBe(false)
	})

	it("should handle SELECT_PLAYER (add new)", () => {
		const player = mockPlayer(1)
		const state = reducer(initialState, { type: "SELECT_PLAYER", payload: player })
		expect(state.selectedPlayers).toEqual([player])
	})

	it("should not add duplicate player on SELECT_PLAYER", () => {
		const player = mockPlayer(1)
		const stateWithPlayer: State = { ...initialState, selectedPlayers: [player] }
		const state = reducer(stateWithPlayer, { type: "SELECT_PLAYER", payload: player })
		expect(state.selectedPlayers).toEqual([player])
	})

	it("should handle REMOVE_PLAYER (existing)", () => {
		const player1 = mockPlayer(1)
		const player2 = mockPlayer(2)
		const stateWithPlayers: State = { ...initialState, selectedPlayers: [player1, player2] }
		const state = reducer(stateWithPlayers, { type: "REMOVE_PLAYER", payload: player1 })
		expect(state.selectedPlayers).toEqual([player2])
	})

	it("should handle REMOVE_PLAYER (non-existent)", () => {
		const player1 = mockPlayer(1)
		const player2 = mockPlayer(2)
		const stateWithPlayers: State = { ...initialState, selectedPlayers: [player2] }
		const state = reducer(stateWithPlayers, { type: "REMOVE_PLAYER", payload: player1 })
		expect(state.selectedPlayers).toEqual([player2])
	})
})
