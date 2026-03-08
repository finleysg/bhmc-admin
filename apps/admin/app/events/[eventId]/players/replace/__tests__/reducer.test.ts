import type { CompleteRegistration, Player, RegistrationSlot } from "@repo/domain/types"
import { reducer, initialState, type State } from "../reducer"

const mockPlayer = { id: 1, firstName: "John", lastName: "Doe" } as Player
const mockSlot = { id: 1, playerId: 1 } as RegistrationSlot
const mockGroup = { id: 1, slots: [mockSlot] } as CompleteRegistration

test("GO_BACK from player step returns to group", () => {
	const state: State = { ...initialState, step: "player", selectedGroup: mockGroup }
	const result = reducer(state, { type: "GO_BACK" })
	expect(result.step).toBe("group")
	expect(result.selectedGroup).toBeUndefined()
})

test("GO_BACK from replacement step returns to player", () => {
	const state: State = {
		...initialState,
		step: "replacement",
		selectedGroup: mockGroup,
		originalPlayer: mockPlayer,
		originalSlot: mockSlot,
	}
	const result = reducer(state, { type: "GO_BACK" })
	expect(result.step).toBe("player")
	expect(result.originalPlayer).toBeNull()
	expect(result.originalSlot).toBeNull()
	expect(result.selectedGroup).toBe(mockGroup)
})

test("GO_BACK from confirm step returns to replacement", () => {
	const state: State = {
		...initialState,
		step: "confirm",
		selectedGroup: mockGroup,
		originalPlayer: mockPlayer,
		originalSlot: mockSlot,
		replacementPlayer: { ...mockPlayer, id: 2 } as Player,
	}
	const result = reducer(state, { type: "GO_BACK" })
	expect(result.step).toBe("replacement")
	expect(result.replacementPlayer).toBeNull()
	expect(result.originalPlayer).toBe(mockPlayer)
})

test("GO_BACK from group step does nothing", () => {
	const state: State = { ...initialState, step: "group" }
	const result = reducer(state, { type: "GO_BACK" })
	expect(result).toEqual(state)
})

test("SET_PROCESSING clears error and replaceSuccess when true", () => {
	const stateWithError: State = {
		...initialState,
		error: new Error("Previous error"),
		replaceSuccess: true,
	}
	const state = reducer(stateWithError, { type: "SET_PROCESSING", payload: true })
	expect(state.isProcessing).toBe(true)
	expect(state.error).toBeNull()
	expect(state.replaceSuccess).toBe(false)
})

test("SET_PROCESSING preserves error and replaceSuccess when false", () => {
	const stateWithError: State = {
		...initialState,
		isProcessing: true,
		error: new Error("Previous error"),
		replaceSuccess: true,
	}
	const state = reducer(stateWithError, { type: "SET_PROCESSING", payload: false })
	expect(state.isProcessing).toBe(false)
	expect(state.error).toEqual(new Error("Previous error"))
	expect(state.replaceSuccess).toBe(true)
})
