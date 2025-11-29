// Reducer logic for AddPlayerPage

import type { AdminRegistrationOptionsState } from "@/components/admin-registration-options"
import type {
	AvailableSlotGroup,
	ClubEvent,
	Player,
	AdminRegistration,
	AdminRegistrationSlot,
	EventFee,
} from "@repo/domain/types"

export interface AddPlayerState {
	event: ClubEvent | null
	selectedPlayers: Player[]
	adminRegistration: AdminRegistration
	selectedSlotGroup: AvailableSlotGroup | null
	registrationOptions: AdminRegistrationOptionsState
	registrationId: number | null
	selectedFees: { playerId: number; eventFeeId: number }[]
	canSelectGroup: boolean
	canSelectFees: boolean
	canReserveSpot: boolean
	canCompleteRegistration: boolean
	isLoading: boolean
	error: string | null
	completeSuccess: boolean
}

export type Action =
	| { type: "SET_EVENT"; payload: ClubEvent }
	| { type: "SET_IS_LOADING"; payload: boolean }
	| { type: "ADD_PLAYER"; payload: Player }
	| { type: "REMOVE_PLAYER"; payload: Player }
	| { type: "SELECT_SLOTS"; payload: { slotIds: number[]; group?: AvailableSlotGroup } }
	| { type: "SET_FEES"; payload: { playerId: number; eventFeeId: number }[] }
	| { type: "SET_REGISTRATION_ID"; payload: number }
	| { type: "SET_REGISTRATION_OPTIONS"; payload: AdminRegistrationOptionsState }
	| { type: "SET_COMPLETE_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: unknown }
	| { type: "RESET_ERROR" }
	| { type: "SET_USER"; payload: { signedUpBy: string } }

export function getInitialState(): AddPlayerState {
	return {
		event: null,
		isLoading: true,
		selectedPlayers: [],
		selectedSlotGroup: null,
		selectedFees: [],
		error: null,
		registrationId: null,
		registrationOptions: {
			expires: 24,
			sendPaymentRequest: true,
			notes: "",
		},
		adminRegistration: {
			userId: 0,
			signedUpBy: "",
			courseId: null,
			startingHoleId: 0,
			startingOrder: 0,
			expires: 24,
			notes: "",
			collectPayment: true,
			slots: [],
		},
		canCompleteRegistration: false,
		canReserveSpot: false,
		canSelectFees: false,
		canSelectGroup: false,
		completeSuccess: false,
	}
}

function generateAdminRegistration(
	state: Omit<AddPlayerState, "adminRegistration"> & { registrationId: number | null },
): AdminRegistration {
	// Derive courseId from selectedSlotGroup and event
	let courseId: number | null = null
	if (state.event?.courses && state.selectedSlotGroup) {
		for (const course of state.event.courses) {
			if (course.holes?.some((h) => h.id === state.selectedSlotGroup.holeId)) {
				courseId = course.id
				break
			}
		}
	}

	// Map fees to full objects required by DTO
	const feesMap = new Map<number, number>() // playerId -> eventFeeId
	state.selectedFees.forEach((f) => feesMap.set(f.playerId, f.eventFeeId))

	// Build slots array
	let slots: AdminRegistrationSlot[] = []
	if (state.selectedSlotGroup && state.selectedPlayers.length > 0) {
		const selectedSlotIds = state.selectedSlotGroup.slots.map((s) => s.id)
		slots = selectedSlotIds.map((slotId, index) => {
			const player = state.selectedPlayers[index]
			const feeId = player ? feesMap.get(player.id) : undefined
			const eventFee: EventFee | undefined =
				feeId && state.event?.eventFees
					? state.event.eventFees.find((f) => f.id === feeId)
					: undefined

			return {
				registrationId: state.registrationId ?? 0,
				slotId,
				playerId: player?.id || 0,
				fees: eventFee ? [eventFee] : [],
			}
		})
	}

	// Set userId to the userId of the first player in selectedPlayers
	const firstPlayerId = state.selectedPlayers.length > 0 ? state.selectedPlayers[0].id : 0

	return {
		userId: firstPlayerId,
		signedUpBy: "",
		courseId,
		startingHoleId: state.selectedSlotGroup?.holeId ?? 0,
		startingOrder: state.selectedSlotGroup?.startingOrder ?? 0,
		expires: state.registrationOptions.expires,
		notes: state.registrationOptions.notes,
		collectPayment: state.registrationOptions.sendPaymentRequest,
		slots,
	}
}

export function reducer(state: AddPlayerState, action: Action): AddPlayerState {
	switch (action.type) {
		case "SET_EVENT": {
			const nextState = { ...state, event: action.payload }
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SET_IS_LOADING":
			return { ...state, isLoading: action.payload }
		case "ADD_PLAYER": {
			const newPlayers = [...state.selectedPlayers, action.payload]
			const nextState = {
				...state,
				selectedPlayers: newPlayers,
				canSelectGroup: newPlayers.length > 0 && state.event?.canChoose,
				canSelectFees:
					newPlayers.length > 0 &&
					(state.event?.canChoose ? state.selectedSlotGroup !== null : true),
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "REMOVE_PLAYER": {
			const newPlayers = state.selectedPlayers.filter(
				(p) => p.id !== action.payload.id || p.email !== action.payload.email,
			)
			const nextState = {
				...state,
				selectedPlayers: newPlayers,
				canSelectGroup: newPlayers.length > 0 && state.event?.canChoose,
				canSelectFees:
					newPlayers.length > 0 &&
					(state.event?.canChoose ? state.selectedSlotGroup !== null : true),
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SELECT_SLOTS": {
			const group = action.payload.group ?? null
			const nextState = {
				...state,
				selectedSlotGroup: group,
				registrationId: null,
				completeSuccess: false,
				canSelectFees:
					state.selectedPlayers.length > 0 && (state.event?.canChoose ? group !== null : true),
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SET_FEES": {
			const fees = action.payload
			const nextState = {
				...state,
				selectedFees: fees,
				canReserveSpot: fees.length > 0,
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SET_REGISTRATION_ID": {
			const id = action.payload
			const nextState = {
				...state,
				registrationId: id,
				canCompleteRegistration: id !== null,
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SET_REGISTRATION_OPTIONS": {
			const nextState = { ...state, registrationOptions: action.payload }
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		case "SET_COMPLETE_SUCCESS":
			return { ...state, completeSuccess: action.payload }
		case "SET_ERROR": {
			let errorMsg: string
			if (action.payload instanceof Error) {
				errorMsg = action.payload.message
			} else if (typeof action.payload === "string") {
				errorMsg = action.payload
			} else {
				errorMsg = JSON.stringify(action.payload)
			}
			return { ...state, error: errorMsg }
		}
		case "RESET_ERROR":
			return { ...state, error: null }
		// New action for setting user context
		case "SET_USER": {
			const { signedUpBy } = action.payload
			return {
				...state,
				adminRegistration: {
					...state.adminRegistration,
					signedUpBy,
				},
			}
		}
		default:
			return state
	}
}
