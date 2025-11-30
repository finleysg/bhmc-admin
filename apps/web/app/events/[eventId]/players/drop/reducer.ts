// Reducer and types for DropPlayerPage

import type { ValidatedClubEvent, ValidatedRegistration, ValidatedPlayer } from "@repo/domain/types"

export type State = {
	clubEvent: ValidatedClubEvent | null
	selectedGroup: ValidatedRegistration | undefined
	selectedPlayers: ValidatedPlayer[]
	error: unknown
	isLoading: boolean
}

export type Action =
	| { type: "SET_EVENT"; payload: ValidatedClubEvent }
	| { type: "SET_GROUP"; payload: ValidatedRegistration }
	| { type: "SET_ERROR"; payload: unknown }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SELECT_PLAYER"; payload: ValidatedPlayer }
	| { type: "REMOVE_PLAYER"; payload: ValidatedPlayer }

/**
 * Produce the next reducer state for the Drop Player page given the current state and an action.
 *
 * Handles these actions:
 * - `SET_EVENT`: sets the current `clubEvent`.
 * - `SET_GROUP`: sets `selectedGroup` and derives `selectedPlayers` from the group's `slots` (extracts present players).
 * - `SET_ERROR`: sets the `error` field.
 * - `SET_LOADING`: sets the `isLoading` flag.
 * - `SELECT_PLAYER`: appends the player to `selectedPlayers` only if a player with the same `id` is not already present.
 * - `REMOVE_PLAYER`: removes the player with a matching `id` from `selectedPlayers`.
 *
 * @param state - The current reducer state.
 * @param action - The action to apply.
 * @returns The updated state after applying the action.
 */
export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_EVENT":
			return { ...state, clubEvent: action.payload }
		case "SET_GROUP":
			return {
				...state,
				selectedGroup: action.payload,
				selectedPlayers: action.payload.slots
					.map((s) => s.player)
					.filter((p): p is ValidatedPlayer => !!p),
			}
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "SELECT_PLAYER":
			// Add player if not already selected
			if (state.selectedPlayers.some((p) => p.id === action.payload.id)) {
				return state
			}
			return { ...state, selectedPlayers: [...state.selectedPlayers, action.payload] }
		case "REMOVE_PLAYER":
			// Remove player by id
			return {
				...state,
				selectedPlayers: state.selectedPlayers.filter((p) => p.id !== action.payload.id),
			}
		default:
			return state
	}
}

export const initialState: State = {
	clubEvent: null,
	selectedGroup: undefined,
	selectedPlayers: [],
	error: null,
	isLoading: true,
}