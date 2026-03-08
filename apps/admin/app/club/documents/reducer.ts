import type { ClubDocumentCode, StaticDocument } from "@repo/domain/types"

export type Mode = "list" | "upload" | "replace" | "delete"

export type ClubDocumentsState = {
	mode: Mode
	codes: ClubDocumentCode[]
	staticDocuments: StaticDocument[]
	selectedCode: ClubDocumentCode | null
	selectedDocument: StaticDocument | null
	isLoading: boolean
	isSubmitting: boolean
	error: string | null
}

export type Action =
	| { type: "SET_CODES"; payload: ClubDocumentCode[] }
	| { type: "SET_STATIC_DOCUMENTS"; payload: StaticDocument[] }
	| { type: "SET_MODE"; payload: Mode }
	| { type: "SELECT_CODE"; payload: ClubDocumentCode }
	| { type: "SELECT_DOCUMENT"; payload: StaticDocument }
	| { type: "SET_SUBMITTING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "RESET" }

export function reducer(state: ClubDocumentsState, action: Action): ClubDocumentsState {
	switch (action.type) {
		case "SET_CODES":
			return { ...state, codes: action.payload }
		case "SET_STATIC_DOCUMENTS":
			return { ...state, staticDocuments: action.payload }
		case "SET_MODE":
			return { ...state, mode: action.payload }
		case "SELECT_CODE":
			return { ...state, selectedCode: action.payload }
		case "SELECT_DOCUMENT":
			return { ...state, selectedDocument: action.payload }
		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.payload }
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "RESET":
			return { ...state, mode: "list", selectedCode: null, selectedDocument: null, error: null }
		default:
			return state
	}
}

export const initialState: ClubDocumentsState = {
	mode: "list",
	codes: [],
	staticDocuments: [],
	selectedCode: null,
	selectedDocument: null,
	isLoading: true,
	isSubmitting: false,
	error: null,
}
