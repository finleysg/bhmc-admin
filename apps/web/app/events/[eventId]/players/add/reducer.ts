// Reducer logic for AddPlayerPage

import type { AdminRegistrationOptionsState } from "@/components/admin-registration-options"
import {
	type AvailableSlotGroup,
	type CompleteClubEvent as ClubEvent,
	type Player,
	type AdminRegistration,
	type AdminRegistrationSlot,
	type RegistrationSlot,
	RegistrationStatusChoices,
} from "@repo/domain/types"

export interface AddPlayerState {
	signedUpBy: string
	event: ClubEvent | null
	selectedPlayers: Player[]
	adminRegistration: AdminRegistration | null
	selectedSlotGroup: AvailableSlotGroup | null
	registrationOptions: AdminRegistrationOptionsState
	selectedFees: { playerId: number; eventFeeId: number }[]
	canSelectGroup: boolean
	canSelectFees: boolean
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
	| { type: "SET_REGISTRATION_OPTIONS"; payload: AdminRegistrationOptionsState }
	| { type: "SET_COMPLETE_SUCCESS"; payload: boolean }
	| { type: "SET_ERROR"; payload: unknown }
	| { type: "RESET_ERROR" }
	| { type: "SET_USER"; payload: { signedUpBy: string } }

export function getInitialState(): AddPlayerState {
	return {
		event: null,
		selectedPlayers: [],
		selectedSlotGroup: null,
		selectedFees: [],
		signedUpBy: "",
		registrationOptions: {
			expires: 24,
			sendPaymentRequest: true,
			notes: "",
		},
		adminRegistration: null,
		isLoading: true,
		canCompleteRegistration: false,
		canSelectFees: false,
		canSelectGroup: false,
		completeSuccess: false,
		error: null,
	}
}

function createSyntheticSlot(player: Player, eventId: number): RegistrationSlot {
	return {
		id: 0, // API ignores for non-CanChoose
		registrationId: 0,
		eventId,
		startingOrder: 0,
		slot: 0,
		status: RegistrationStatusChoices.AVAILABLE,
		playerId: player.id,
		player,
	}
}

export function generateAdminRegistration(
	state: Omit<AddPlayerState, "adminRegistration">,
): AdminRegistration | null {
	// null until we can register
	if (!state.canCompleteRegistration) {
		return null
	}

	// Derive courseId from selectedSlotGroup and event
	let courseId: number | null = null
	if (state.event?.canChoose) {
		for (const course of state.event.courses ?? []) {
			if (course.holes?.some((h) => h.id === state.selectedSlotGroup?.holeId)) {
				courseId = course.id
				break
			}
		}
	}

	// Map players to their selected fees for convenience
	const feesMap = new Map<number, number[]>() // playerId -> eventFeeId[]
	state.selectedFees.forEach((f) => {
		const existing = feesMap.get(f.playerId) || []
		feesMap.set(f.playerId, [...existing, f.eventFeeId])
	})

	// Build slots array - only include players that have corresponding slots
	let slots: AdminRegistrationSlot[] = []
	if (state.selectedSlotGroup && state.selectedPlayers.length > 0) {
		const availableSlots = state.selectedSlotGroup.slots
		const playersWithSlots = state.selectedPlayers.slice(0, availableSlots.length)
		slots = playersWithSlots.map((p, index) => {
			const feeIds = feesMap.get(p.id) ?? []
			return {
				slotId: availableSlots[index].id,
				playerId: p.id,
				feeIds,
			}
		})
	}

	return {
		userId: state.selectedPlayers[0].userId ?? -1,
		signedUpBy: state.signedUpBy,
		courseId,
		startingHoleId: state.selectedSlotGroup?.holeId ?? -1,
		startingOrder: state.selectedSlotGroup?.startingOrder ?? -1,
		expires: state.registrationOptions.expires,
		notes: state.registrationOptions.notes,
		collectPayment: state.registrationOptions.sendPaymentRequest,
		slots,
	}
}

function choosableReducer(state: AddPlayerState, action: Action): AddPlayerState {
	switch (action.type) {
		case "ADD_PLAYER": {
			const newPlayers = [...state.selectedPlayers, action.payload]
			const nextState = {
				...state,
				selectedPlayers: newPlayers,
				canSelectGroup: newPlayers.length > 0,
				canSelectFees: newPlayers.length > 0 && state.selectedSlotGroup !== null,
				canCompleteRegistration: newPlayers.length > 0 && state.selectedSlotGroup !== null,
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
				canSelectGroup: newPlayers.length > 0,
				canSelectFees: newPlayers.length > 0 && state.selectedSlotGroup !== null,
				canCompleteRegistration: newPlayers.length > 0 && state.selectedSlotGroup !== null,
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
				completeSuccess: false,
				canSelectFees: state.selectedPlayers.length > 0 && group !== null,
				canCompleteRegistration: state.selectedPlayers.length > 0 && group !== null,
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
				canCompleteRegistration:
					state.selectedPlayers.length > 0 && state.selectedSlotGroup !== null,
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		default:
			return state
	}
}

function nonChoosableReducer(state: AddPlayerState, action: Action): AddPlayerState {
	switch (action.type) {
		case "ADD_PLAYER": {
			const newPlayers = [...state.selectedPlayers, action.payload]
			const newSlot = createSyntheticSlot(action.payload, state.event!.id)
			const existingSlots = state.selectedSlotGroup?.slots ?? []
			const slotGroup: AvailableSlotGroup = {
				holeId: 0,
				holeNumber: 0,
				startingOrder: 0,
				slots: [...existingSlots, newSlot],
			}
			const nextState = {
				...state,
				selectedPlayers: newPlayers,
				selectedSlotGroup: slotGroup,
				canSelectGroup: false,
				canSelectFees: newPlayers.length > 0,
				canCompleteRegistration: newPlayers.length > 0,
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
			const updatedSlots = (state.selectedSlotGroup?.slots ?? []).filter(
				(s) => s.playerId !== action.payload.id,
			)
			const slotGroup =
				updatedSlots.length > 0 ? { ...state.selectedSlotGroup!, slots: updatedSlots } : null
			const nextState = {
				...state,
				selectedPlayers: newPlayers,
				selectedSlotGroup: slotGroup,
				canSelectGroup: false,
				canSelectFees: newPlayers.length > 0,
				canCompleteRegistration: newPlayers.length > 0,
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
				canCompleteRegistration: state.selectedPlayers.length > 0,
			}
			return {
				...nextState,
				adminRegistration: generateAdminRegistration(nextState),
			}
		}
		default:
			return state
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
		case "SET_USER": {
			const { signedUpBy } = action.payload
			return {
				...state,
				signedUpBy,
			}
		}
		default:
			if (state.event?.canChoose) {
				return choosableReducer(state, action)
			}
			return nonChoosableReducer(state, action)
	}
}
