// Reducer and types for ReplacePlayerPage

import type {
	CompleteClubEvent,
	CompleteRegistration,
	Player,
	RegistrationSlot,
} from "@repo/domain/types"

export type Step = "group" | "player" | "replacement" | "confirm"

export type State = {
	clubEvent: CompleteClubEvent | null
	selectedGroup: CompleteRegistration | undefined
	originalPlayer: Player | null
	originalSlot: RegistrationSlot | null
	replacementPlayer: Player | null
	notes: string
	step: Step
	isLoading: boolean
	isProcessing: boolean
	error: unknown
	replaceSuccess: boolean
}

export type Action =
	| { type: "SET_EVENT"; payload: CompleteClubEvent }
	| { type: "SET_GROUP"; payload: CompleteRegistration }
	| { type: "SET_ORIGINAL_PLAYER"; payload: { player: Player; slot: RegistrationSlot } }
	| { type: "SET_REPLACEMENT_PLAYER"; payload: Player }
	| { type: "SET_NOTES"; payload: string }
	| { type: "SET_PROCESSING"; payload: boolean }
	| { type: "SET_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: unknown }
	| { type: "RESET" }

/**
 * Reducer for replace player page with stepped workflow.
 * Steps: group -> player -> replacement -> confirm
 */
export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_EVENT":
			return { ...state, clubEvent: action.payload, isLoading: false }
		case "SET_GROUP":
			return { ...state, selectedGroup: action.payload, step: "player" }
		case "SET_ORIGINAL_PLAYER":
			return {
				...state,
				originalPlayer: action.payload.player,
				originalSlot: action.payload.slot,
				step: "replacement",
			}
		case "SET_REPLACEMENT_PLAYER":
			return { ...state, replacementPlayer: action.payload, step: "confirm" }
		case "SET_NOTES":
			return { ...state, notes: action.payload }
		case "SET_PROCESSING":
			return { ...state, isProcessing: action.payload }
		case "SET_SUCCESS":
			return { ...state, replaceSuccess: action.payload, isProcessing: false }
		case "SET_ERROR":
			return { ...state, error: action.payload, isProcessing: false }
		case "RESET":
			return { ...initialState, clubEvent: state.clubEvent, isLoading: false }
		default:
			return state
	}
}

export const initialState: State = {
	clubEvent: null,
	selectedGroup: undefined,
	originalPlayer: null,
	originalSlot: null,
	replacementPlayer: null,
	notes: "",
	step: "group",
	isLoading: true,
	isProcessing: false,
	error: null,
	replaceSuccess: false,
}
