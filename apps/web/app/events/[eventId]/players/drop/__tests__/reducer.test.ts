// Unit tests for DropPlayer reducer

import { reducer, initialState, State, Action } from "../reducer"
import type { ValidatedPlayer, ValidatedClubEvent, ValidatedRegistration } from "@repo/domain/types"

const mockPlayer = (id: number): ValidatedPlayer => ({
	id,
	firstName: `First${id}`,
	lastName: `Last${id}`,
	email: `player${id}@test.com`,
	tee: "Championship",
	isMember: true,
})

const mockClubEvent: ValidatedClubEvent = {
	id: 1,
	name: "Test Event",
} as ValidatedClubEvent

const mockRegistration = (playerIds: Array<number | null>): ValidatedRegistration =>
	({
		id: 10,
		slots: playerIds.map((id) => ({ player: id !== null ? mockPlayer(id) : null })),
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
