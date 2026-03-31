import { produce } from "immer"

import type { ClubEventDetail, EventFee } from "../types"
import { calculateFeeAmount, type FeePlayer } from "./fee-utils"
import type {
	RegistrationMode,
	ServerPayment,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
} from "./types"

export interface RegistrationStep {
	name: "pending" | "reserve" | "register" | "review" | "payment" | "complete"
	order: number
	title: string
}

export const PendingStep: RegistrationStep = {
	name: "pending",
	order: 0,
	title: "No Registration Started",
}
export const ReserveStep: RegistrationStep = {
	name: "reserve",
	order: 1,
	title: "Reserve Tee Time or Starting Hole",
}
export const RegisterStep: RegistrationStep = {
	name: "register",
	order: 2,
	title: "Players and Fees",
}
export const ReviewStep: RegistrationStep = {
	name: "review",
	order: 3,
	title: "Review Registration Details",
}
export const PaymentStep: RegistrationStep = {
	name: "payment",
	order: 4,
	title: "Submit Payment",
}
export const CompleteStep: RegistrationStep = {
	name: "complete",
	order: 5,
	title: "Registration Complete",
}

export interface SessionFeeOverride {
	eventFeeId: number
	amount: number
}

export interface SelectedSession {
	id: number
	name: string
	registrationLimit: number
	feeOverrides: SessionFeeOverride[]
}

export interface RegistrationState {
	mode: RegistrationMode
	clubEvent: ClubEventDetail | null
	registration: ServerRegistration | null
	payment: ServerPayment | null
	existingFees: Map<string, ServerRegistrationFee> | null
	error: string | null
	currentStep: RegistrationStep
	selectedStart: string | null
	selectedSession: SelectedSession | null
	stripeClientSession?: string
	correlationId: string
	sseCurrentWave: number | null
	sseConnected: boolean
}

export type RegistrationAction =
	| {
			type: "load-event"
			payload: { clubEvent: ClubEventDetail | null; correlationId: string }
	  }
	| {
			type: "load-registration"
			payload: {
				registration: ServerRegistration
				payment: ServerPayment
				existingFees: ServerRegistrationFee[]
			}
	  }
	| {
			type: "create-registration"
			payload: { registration: ServerRegistration; payment: ServerPayment; selectedStart?: string }
	  }
	| { type: "update-registration"; payload: { registration: ServerRegistration } }
	| { type: "update-registration-notes"; payload: { notes: string } }
	| { type: "cancel-registration" }
	| { type: "complete-registration" }
	| { type: "reset-registration"; payload: { clubEvent: ClubEventDetail } }
	| { type: "update-payment"; payload: { payment: ServerPayment } }
	| { type: "update-error"; payload: { error: string | null } }
	| { type: "update-step"; payload: { step: RegistrationStep } }
	| {
			type: "add-player"
			payload: {
				slot: ServerRegistrationSlot
				playerId: number
				playerName: string
				player: FeePlayer
			}
	  }
	| { type: "remove-player"; payload: { slotId: number } }
	| {
			type: "add-fee"
			payload: { slotId: number; eventFee: EventFee; player: FeePlayer }
	  }
	| { type: "remove-fee"; payload: { slotId: number; eventFeeId: number } }
	| { type: "initiate-stripe-session"; payload: { clientSessionKey: string } }
	| { type: "select-session"; payload: { session: SelectedSession } }
	| { type: "update-sse-wave"; payload: { wave: number } }
	| { type: "update-sse-connected"; payload: { connected: boolean } }

export const defaultRegistrationState: RegistrationState = {
	mode: "idle",
	clubEvent: null,
	registration: null,
	payment: null,
	existingFees: null,
	error: null,
	currentStep: PendingStep,
	selectedStart: null,
	selectedSession: null,
	stripeClientSession: undefined,
	correlationId: "",
	sseCurrentWave: null,
	sseConnected: false,
}

export const registrationReducer = produce(
	(draft: RegistrationState, action: RegistrationAction) => {
		switch (action.type) {
			case "load-event": {
				draft.clubEvent = action.payload.clubEvent
				draft.registration = null
				draft.payment = null
				draft.existingFees = null
				draft.error = null
				draft.mode = "idle"
				draft.currentStep = PendingStep
				draft.correlationId = action.payload.correlationId
				return
			}
			case "update-step": {
				draft.currentStep = action.payload.step
				return
			}
			case "load-registration": {
				draft.mode = "edit"
				draft.currentStep = RegisterStep
				draft.registration = action.payload.registration
				draft.existingFees = new Map(
					action.payload.existingFees.map((fee) => [
						`${fee.registrationSlotId}-${fee.eventFeeId}`,
						fee,
					]),
				)
				draft.payment = action.payload.payment
				return
			}
			case "create-registration": {
				draft.mode = "new"
				draft.registration = action.payload.registration
				draft.payment = action.payload.payment
				draft.selectedStart = action.payload.selectedStart ?? null
				draft.currentStep = RegisterStep
				return
			}
			case "update-registration": {
				draft.registration = action.payload.registration
				draft.error = null
				return
			}
			case "update-registration-notes": {
				if (draft.registration) {
					draft.registration.notes = action.payload.notes
				}
				return
			}
			case "cancel-registration": {
				draft.registration = null
				draft.payment = null
				draft.existingFees = null
				draft.error = null
				draft.selectedStart = null
				draft.selectedSession = null
				draft.mode = "idle"
				draft.currentStep = PendingStep
				return
			}
			case "complete-registration": {
				draft.registration = null
				draft.payment = null
				draft.existingFees = null
				draft.error = null
				draft.selectedStart = null
				draft.selectedSession = null
				draft.mode = "idle"
				draft.currentStep = CompleteStep
				return
			}
			case "update-payment": {
				draft.payment = action.payload.payment
				draft.error = null
				return
			}
			case "add-player": {
				const { slot, playerId, playerName, player } = action.payload
				const slotToUpdate = draft.registration?.slots.find((s) => s.id === slot.id)
				if (slotToUpdate) {
					slotToUpdate.player = {
						id: playerId,
						firstName: playerName.split(" ")[0] ?? "",
						lastName: playerName.split(" ").slice(1).join(" "),
						email: null,
						ghin: null,
						birthDate: player.birthDate,
						phoneNumber: null,
						tee: null,
						isMember: player.isMember,
						lastSeason: player.lastSeason,
					}
				}
				// Auto-add required fees for this slot
				const sessionOverrides = draft.selectedSession?.feeOverrides
				draft.clubEvent?.fees
					.filter((f) => f.is_required)
					.forEach((fee) => {
						if (draft.payment) {
							draft.payment.details.push({
								id: 0,
								paymentId: draft.payment.id,
								eventFeeId: fee.id,
								registrationSlotId: slot.id,
								amount: calculateFeeAmount(fee, player, sessionOverrides),
								isPaid: false,
							})
						}
					})
				return
			}
			case "remove-player": {
				const removeSlot = draft.registration?.slots.find((s) => s.id === action.payload.slotId)
				if (removeSlot) {
					removeSlot.player = null
					// Remove fees for this slot
					if (draft.payment) {
						draft.payment.details = draft.payment.details.filter(
							(d) => d.registrationSlotId !== removeSlot.id,
						)
					}
				}
				return
			}
			case "add-fee": {
				if (draft.payment) {
					draft.payment.details.push({
						id: 0,
						paymentId: draft.payment.id,
						eventFeeId: action.payload.eventFee.id,
						registrationSlotId: action.payload.slotId,
						amount: calculateFeeAmount(
							action.payload.eventFee,
							action.payload.player,
							draft.selectedSession?.feeOverrides,
						),
						isPaid: false,
					})
				}
				return
			}
			case "remove-fee": {
				if (draft.payment) {
					const index = draft.payment.details.findIndex(
						(p) =>
							p.eventFeeId === action.payload.eventFeeId &&
							p.registrationSlotId === action.payload.slotId,
					)
					if (index >= 0) {
						draft.payment.details.splice(index, 1)
					}
				}
				return
			}
			case "update-error": {
				draft.error = action.payload.error
				return
			}
			case "initiate-stripe-session": {
				draft.stripeClientSession = action.payload.clientSessionKey
				return
			}
			case "select-session": {
				draft.selectedSession = action.payload.session
				return
			}
			case "update-sse-wave": {
				draft.sseCurrentWave = action.payload.wave
				return
			}
			case "update-sse-connected": {
				draft.sseConnected = action.payload.connected
				return
			}
			case "reset-registration": {
				draft.clubEvent = action.payload.clubEvent
				draft.registration = null
				draft.payment = null
				draft.existingFees = null
				draft.error = null
				draft.selectedStart = null
				draft.selectedSession = null
				draft.mode = "idle"
				draft.currentStep = PendingStep
				return
			}
		}
	},
	defaultRegistrationState,
)
