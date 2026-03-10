import type { Announcement } from "./types"

export type Mode = "list" | "delete"

export type AnnouncementsState = {
	mode: Mode
	announcements: Announcement[]
	selectedAnnouncement: Announcement | null
	isLoading: boolean
	isSubmitting: boolean
	error: string | null
}

export type Action =
	| { type: "SET_ANNOUNCEMENTS"; payload: Announcement[] }
	| { type: "SET_MODE"; payload: Mode }
	| { type: "SELECT_ANNOUNCEMENT"; payload: Announcement }
	| { type: "SET_SUBMITTING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "RESET" }

export function reducer(state: AnnouncementsState, action: Action): AnnouncementsState {
	switch (action.type) {
		case "SET_ANNOUNCEMENTS":
			return { ...state, announcements: action.payload }
		case "SET_MODE":
			return { ...state, mode: action.payload }
		case "SELECT_ANNOUNCEMENT":
			return { ...state, selectedAnnouncement: action.payload }
		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.payload }
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "RESET":
			return { ...state, mode: "list", selectedAnnouncement: null, error: null }
		default:
			return state
	}
}

export const initialState: AnnouncementsState = {
	mode: "list",
	announcements: [],
	selectedAnnouncement: null,
	isLoading: true,
	isSubmitting: false,
	error: null,
}
