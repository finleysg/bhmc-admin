import type { ClubEvent, Document } from "@repo/domain/types"

export type Mode = "list" | "add" | "edit" | "delete"

export type DocumentsState = {
	mode: Mode
	documents: Document[]
	selectedDocument: Document | null
	clubEvent: ClubEvent | null
	isLoading: boolean
	isSubmitting: boolean
	error: string | null
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| { type: "SET_DOCUMENTS"; payload: Document[] }
	| { type: "SET_MODE"; payload: Mode }
	| { type: "SELECT_DOCUMENT"; payload: Document }
	| { type: "SET_SUBMITTING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "RESET" }

export function reducer(state: DocumentsState, action: Action): DocumentsState {
	switch (action.type) {
		case "SET_EVENT":
			return { ...state, clubEvent: action.payload, isLoading: false }
		case "SET_DOCUMENTS":
			return { ...state, documents: action.payload }
		case "SET_MODE":
			return { ...state, mode: action.payload }
		case "SELECT_DOCUMENT":
			return { ...state, selectedDocument: action.payload }
		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.payload }
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "RESET":
			return { ...state, mode: "list", selectedDocument: null, error: null }
		default:
			return state
	}
}

export const initialState: DocumentsState = {
	mode: "list",
	documents: [],
	selectedDocument: null,
	clubEvent: null,
	isLoading: true,
	isSubmitting: false,
	error: null,
}
