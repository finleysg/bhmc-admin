// Reducer and types for DropPlayerPage

import type {
	CompleteClubEvent,
	CompleteRegistration,
	Player,
	RefundRequest,
} from "@repo/domain/types"

export type DropPlayerStep = "group" | "player" | "fee" | "confirm"

export type State = {
	clubEvent: CompleteClubEvent | null
	selectedGroup: CompleteRegistration | undefined
	selectedPlayers: Player[]
	selectedFees: { slotId: number; registrationFeeIds: number[] }[]
	error?: unknown
	isLoading: boolean
	dropSuccess: boolean
	droppedPlayers: Player[]
	droppedRefundCount: number
	isProcessing: boolean
	resetKey: number
	step: DropPlayerStep
}

export type Action =
	| { type: "SET_EVENT"; payload: CompleteClubEvent }
	| { type: "SET_GROUP"; payload: CompleteRegistration }
	| { type: "SET_ERROR"; payload: unknown }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SELECT_PLAYER"; payload: Player }
	| { type: "REMOVE_PLAYER"; payload: Player }
	| { type: "SET_FEES"; payload: { slotId: number; registrationFeeIds: number[] }[] }
	| { type: "SET_PROCESSING"; payload: boolean }
	| { type: "SET_DROP_SUCCESS"; payload: boolean }
	| { type: "RESET_STATE" }
	| { type: "RESET_SELECTIONS" }
	| { type: "RESET_ERROR" }
	| { type: "NEXT_STEP" }
	| { type: "GO_BACK" }

export function translateRefundRequests(state: State): RefundRequest[] {
	const refundRequests: RefundRequest[] = []
	const paymentMap: Map<number, number[]> = new Map()
	state.selectedFees.forEach(({ slotId, registrationFeeIds }) => {
		const slot = state.selectedGroup?.slots.find((s) => s.id === slotId)
		if (!slot) return
		registrationFeeIds.forEach((feeId) => {
			const fee = slot.fees.find((f) => f.id === feeId)
			if (fee) {
				const existing = paymentMap.get(fee.paymentId) ?? []
				paymentMap.set(fee.paymentId, [...existing, feeId])
			}
		})
	})
	paymentMap.forEach((registrationFeeIds: number[], paymentId: number) => {
		refundRequests.push({ paymentId, registrationFeeIds })
	})
	return refundRequests
}

/**
 * Produce the next reducer state for the Drop Player page given the current state and an action.
 *
 * Handles these actions:
 * - `SET_EVENT`: sets the current `clubEvent`.
 * - `SET_GROUP`: sets `selectedGroup` and derives `selectedPlayers` from the group's `slots` by extracting present players.
 * - `SET_ERROR`: sets the `error` field.
 * - `SET_LOADING`: sets the `isLoading` flag.
 * - `SELECT_PLAYER`: appends the player to `selectedPlayers` only if a player with the same `id` is not already present.
 * - `REMOVE_PLAYER`: removes players with a matching `id` from `selectedPlayers`.
 * - `SET_FEES`: replaces `selectedFees` with the provided array of `{ slotId, registrationFeeIds }`.
 *
 * @param state - The current reducer state
 * @param action - The action to apply
 * @returns The new state resulting from applying `action` to `state`
 */
export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_EVENT":
			return { ...state, clubEvent: action.payload }
		case "SET_GROUP":
			return {
				...state,
				selectedGroup: action.payload,
				selectedPlayers: action.payload.slots.map((s) => s.player).filter((p): p is Player => !!p),
				step: "player",
			}
		case "SET_ERROR":
			return { ...state, error: action.payload }
		case "SET_LOADING":
			return { ...state, isLoading: action.payload }
		case "SELECT_PLAYER":
			if (state.selectedPlayers.some((p) => p.id === action.payload.id)) {
				return state
			}
			return { ...state, selectedPlayers: [...state.selectedPlayers, action.payload] }
		case "REMOVE_PLAYER":
			return {
				...state,
				selectedPlayers: state.selectedPlayers.filter((p) => p.id !== action.payload.id),
			}
		case "SET_FEES":
			return { ...state, selectedFees: action.payload }
		case "SET_PROCESSING":
			return { ...state, isProcessing: action.payload }
		case "SET_DROP_SUCCESS":
			return {
				...state,
				dropSuccess: action.payload,
				droppedPlayers: action.payload ? state.selectedPlayers : [],
				droppedRefundCount: action.payload
					? state.selectedFees.reduce((sum, f) => sum + f.registrationFeeIds.length, 0)
					: 0,
			}
		case "RESET_STATE":
			return { ...initialState }
		case "RESET_SELECTIONS":
			return {
				...state,
				selectedGroup: undefined,
				selectedPlayers: [],
				selectedFees: [],
				dropSuccess: false,
				droppedPlayers: [],
				droppedRefundCount: 0,
				isProcessing: false,
				error: null,
				resetKey: state.resetKey + 1,
				step: "group",
			}
		case "RESET_ERROR":
			return { ...state, error: null }
		case "NEXT_STEP":
			switch (state.step) {
				case "player":
					return { ...state, step: "fee" }
				case "fee":
					return { ...state, step: "confirm" }
				default:
					return state
			}
		case "GO_BACK":
			switch (state.step) {
				case "player":
					return { ...state, step: "group", selectedGroup: undefined, selectedPlayers: [] }
				case "fee":
					return { ...state, step: "player", selectedFees: [] }
				case "confirm":
					return { ...state, step: "fee" }
				default:
					return state
			}
		default:
			return state
	}
}

export const initialState: State = {
	clubEvent: null,
	selectedGroup: undefined,
	selectedPlayers: [],
	selectedFees: [],
	error: null,
	isLoading: true,
	dropSuccess: false,
	droppedPlayers: [],
	droppedRefundCount: 0,
	isProcessing: false,
	resetKey: 0,
	step: "group",
}
