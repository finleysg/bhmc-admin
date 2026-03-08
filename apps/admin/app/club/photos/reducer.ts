import type { Tag } from "@repo/domain/types"

export type PhotoUploadState = {
	tags: Tag[]
	isLoading: boolean
	isSubmitting: boolean
	error: string | null
	success: boolean
}

export type Action =
	| { type: "SET_TAGS"; payload: Tag[] }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_SUBMITTING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_SUCCESS"; payload: boolean }
	| { type: "RESET" }

export function reducer(state: PhotoUploadState, action: Action): PhotoUploadState {
	switch (action.type) {
		case "SET_TAGS":
			return { ...state, tags: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.payload }
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_SUCCESS":
			return { ...state, success: action.payload }
		case "RESET":
			return { ...state, error: null, success: false, isSubmitting: false }
		default:
			return state
	}
}

export const initialState: PhotoUploadState = {
	tags: [],
	isLoading: true,
	isSubmitting: false,
	error: null,
	success: false,
}
