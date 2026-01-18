// Reducer logic for MovePlayersPage

import type {
	AvailableSlotGroup,
	CompleteClubEvent as ClubEvent,
	CompleteRegistration,
	CompleteRegistrationSlot,
	Player,
} from "@repo/domain/types"

export type MovePlayerStep = "group" | "player" | "destination" | "confirm"

export interface MovePlayerState {
	step: MovePlayerStep
	clubEvent: ClubEvent | null
	sourceGroup: CompleteRegistration | null
	selectedPlayers: Player[]
	selectedSourceSlots: CompleteRegistrationSlot[]
	destinationCourseId: number | null
	destinationSlotGroup: AvailableSlotGroup | null
	notes: string
	isLoading: boolean
	isProcessing: boolean
	error: string | null
	moveSuccess: boolean
	resetKey: number
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| { type: "SET_GROUP"; payload: CompleteRegistration }
	| { type: "SELECT_PLAYER"; payload: { player: Player; slot: CompleteRegistrationSlot } }
	| { type: "REMOVE_PLAYER"; payload: number } // playerId
	| { type: "SET_DESTINATION_COURSE"; payload: number }
	| { type: "SET_DESTINATION_SLOTS"; payload: AvailableSlotGroup }
	| { type: "SET_NOTES"; payload: string }
	| { type: "SET_PROCESSING"; payload: boolean }
	| { type: "SET_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "RESET" }
	| { type: "GO_BACK" }

export const initialState: MovePlayerState = {
	step: "group",
	clubEvent: null,
	sourceGroup: null,
	selectedPlayers: [],
	selectedSourceSlots: [],
	destinationCourseId: null,
	destinationSlotGroup: null,
	notes: "",
	isLoading: true,
	isProcessing: false,
	error: null,
	moveSuccess: false,
	resetKey: 0,
}

function getPreviousStep(currentStep: MovePlayerStep): MovePlayerStep {
	switch (currentStep) {
		case "player":
			return "group"
		case "destination":
			return "player"
		case "confirm":
			return "destination"
		default:
			return currentStep
	}
}

export function reducer(state: MovePlayerState, action: Action): MovePlayerState {
	switch (action.type) {
		case "SET_EVENT":
			return {
				...state,
				clubEvent: action.payload,
				isLoading: false,
			}

		case "SET_GROUP":
			return {
				...state,
				sourceGroup: action.payload,
				step: "player",
			}

		case "SELECT_PLAYER": {
			const { player, slot } = action.payload
			return {
				...state,
				selectedPlayers: [...state.selectedPlayers, player],
				selectedSourceSlots: [...state.selectedSourceSlots, slot],
			}
		}

		case "REMOVE_PLAYER": {
			const playerId = action.payload
			return {
				...state,
				selectedPlayers: state.selectedPlayers.filter((p) => p.id !== playerId),
				selectedSourceSlots: state.selectedSourceSlots.filter((s) => s.playerId !== playerId),
			}
		}

		case "SET_DESTINATION_COURSE":
			return {
				...state,
				destinationCourseId: action.payload,
				destinationSlotGroup: null,
				step: "destination",
			}

		case "SET_DESTINATION_SLOTS":
			return {
				...state,
				destinationSlotGroup: action.payload,
				step: "confirm",
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
				moveSuccess: action.payload,
				isProcessing: false,
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
			const clearData: Partial<MovePlayerState> = {}

			// Clear appropriate state based on step transition
			switch (state.step) {
				case "player":
					clearData.sourceGroup = null
					clearData.selectedPlayers = []
					clearData.selectedSourceSlots = []
					break
				case "destination":
					clearData.selectedPlayers = []
					clearData.selectedSourceSlots = []
					clearData.destinationCourseId = null
					clearData.destinationSlotGroup = null
					break
				case "confirm":
					clearData.destinationSlotGroup = null
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
