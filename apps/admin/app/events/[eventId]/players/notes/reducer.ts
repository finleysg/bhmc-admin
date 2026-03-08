// Reducer logic for NotesPage

import type { CompleteClubEvent as ClubEvent, CompleteRegistration } from "@repo/domain/types"

export type NotesStep = "group" | "edit"

export interface NotesState {
	step: NotesStep
	clubEvent: ClubEvent | null
	selectedGroup: CompleteRegistration | null
	notes: string
	isLoading: boolean
	isProcessing: boolean
	error: string | null
	success: boolean
	resetKey: number
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| { type: "SET_GROUP"; payload: CompleteRegistration }
	| { type: "SET_NOTES"; payload: string }
	| { type: "SET_PROCESSING"; payload: boolean }
	| { type: "SET_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "RESET" }
	| { type: "GO_BACK" }

export const initialState: NotesState = {
	step: "group",
	clubEvent: null,
	selectedGroup: null,
	notes: "",
	isLoading: true,
	isProcessing: false,
	error: null,
	success: false,
	resetKey: 0,
}

export function reducer(state: NotesState, action: Action): NotesState {
	switch (action.type) {
		case "SET_EVENT":
			return {
				...state,
				clubEvent: action.payload,
				isLoading: false,
			}

		case "SET_GROUP": {
			const group = action.payload
			return {
				...state,
				selectedGroup: group,
				notes: group.notes || "",
				step: "edit",
			}
		}

		case "SET_NOTES":
			return {
				...state,
				notes: action.payload,
			}

		case "SET_PROCESSING":
			return {
				...state,
				isProcessing: action.payload,
			}

		case "SET_SUCCESS":
			return {
				...state,
				success: action.payload,
				isProcessing: false,
				error: null,
			}

		case "SET_ERROR":
			return {
				...state,
				error: action.payload,
				isProcessing: false,
			}

		case "RESET":
			return {
				...initialState,
				clubEvent: state.clubEvent,
				isLoading: false,
				resetKey: state.resetKey + 1,
			}

		case "GO_BACK":
			return {
				...state,
				selectedGroup: null,
				notes: "",
				step: "group",
			}

		default:
			return state
	}
}
