import type { ClubEvent, EventSessionWithFees } from "@repo/domain/types"

export type Mode = "list" | "add" | "edit" | "delete"

export type SessionsState = {
	mode: Mode
	sessions: EventSessionWithFees[]
	selectedSession: EventSessionWithFees | null
	clubEvent: ClubEvent | null
	isLoading: boolean
	isSubmitting: boolean
	error: string | null
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| { type: "SET_SESSIONS"; payload: EventSessionWithFees[] }
	| { type: "SET_MODE"; payload: Mode }
	| { type: "SELECT_SESSION"; payload: EventSessionWithFees }
	| { type: "SET_SUBMITTING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "RESET" }

export function reducer(state: SessionsState, action: Action): SessionsState {
	switch (action.type) {
		case "SET_EVENT":
			return { ...state, clubEvent: action.payload, isLoading: false }
		case "SET_SESSIONS":
			return { ...state, sessions: action.payload }
		case "SET_MODE":
			return { ...state, mode: action.payload }
		case "SELECT_SESSION":
			return { ...state, selectedSession: action.payload }
		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.payload }
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "RESET":
			return { ...state, mode: "list", selectedSession: null, error: null }
		default:
			return state
	}
}

export const initialState: SessionsState = {
	mode: "list",
	sessions: [],
	selectedSession: null,
	clubEvent: null,
	isLoading: true,
	isSubmitting: false,
	error: null,
}
