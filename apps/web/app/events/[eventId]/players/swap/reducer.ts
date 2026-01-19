// Reducer logic for SwapPlayersPage

import type {
	CompleteClubEvent as ClubEvent,
	CompleteRegistration,
	CompleteRegistrationSlot,
	Player,
} from "@repo/domain/types"

export type SwapPlayerStep = "playerA" | "playerB" | "confirm"

export interface SwapPlayerState {
	step: SwapPlayerStep
	clubEvent: ClubEvent | null
	groupA: CompleteRegistration | null
	playerA: Player | null
	slotA: CompleteRegistrationSlot | null
	groupB: CompleteRegistration | null
	playerB: Player | null
	slotB: CompleteRegistrationSlot | null
	notes: string
	isLoading: boolean
	isProcessing: boolean
	error: string | null
	swapSuccess: boolean
	resetKey: number
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| {
			type: "SET_PLAYER_A"
			payload: {
				group: CompleteRegistration
				player: Player
				slot: CompleteRegistrationSlot
			}
	  }
	| {
			type: "SET_PLAYER_B"
			payload: {
				group: CompleteRegistration
				player: Player
				slot: CompleteRegistrationSlot
			}
	  }
	| { type: "SET_NOTES"; payload: string }
	| { type: "SET_PROCESSING"; payload: boolean }
	| { type: "SET_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "RESET" }
	| { type: "GO_BACK" }

export const initialState: SwapPlayerState = {
	step: "playerA",
	clubEvent: null,
	groupA: null,
	playerA: null,
	slotA: null,
	groupB: null,
	playerB: null,
	slotB: null,
	notes: "",
	isLoading: true,
	isProcessing: false,
	error: null,
	swapSuccess: false,
	resetKey: 0,
}

function getPreviousStep(currentStep: SwapPlayerStep): SwapPlayerStep {
	switch (currentStep) {
		case "playerB":
			return "playerA"
		case "confirm":
			return "playerB"
		default:
			return currentStep
	}
}

export function reducer(state: SwapPlayerState, action: Action): SwapPlayerState {
	switch (action.type) {
		case "SET_EVENT":
			return {
				...state,
				clubEvent: action.payload,
				isLoading: false,
			}

		case "SET_PLAYER_A": {
			const { group, player, slot } = action.payload
			return {
				...state,
				groupA: group,
				playerA: player,
				slotA: slot,
				step: "playerB",
			}
		}

		case "SET_PLAYER_B": {
			const { group, player, slot } = action.payload
			return {
				...state,
				groupB: group,
				playerB: player,
				slotB: slot,
				step: "confirm",
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
				swapSuccess: action.payload,
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

		case "GO_BACK": {
			const previousStep = getPreviousStep(state.step)
			const clearData: Partial<SwapPlayerState> = {}

			// Clear appropriate state based on step transition
			switch (state.step) {
				case "playerB":
					clearData.groupA = null
					clearData.playerA = null
					clearData.slotA = null
					break
				case "confirm":
					clearData.groupB = null
					clearData.playerB = null
					clearData.slotB = null
					clearData.notes = ""
					break
			}

			return {
				...state,
				...clearData,
				step: previousStep,
			}
		}

		default:
			return state
	}
}
