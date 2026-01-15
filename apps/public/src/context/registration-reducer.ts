import { produce } from "immer"

import { ClubEvent } from "../models/club-event"
import { EventFee } from "../models/event-fee"
import { Payment, PaymentDetail } from "../models/payment"
import { Player } from "../models/player"
import { Registration, RegistrationFee, RegistrationSlot } from "../models/registration"

export type RegistrationMode = "new" | "edit" | "idle"
type RegistrationStep = "pending" | "reserve" | "register" | "review" | "payment" | "complete"

export interface IRegistrationStep {
	name: RegistrationStep
	order: number
	title: string
}

export interface IRegistrationState {
	readonly mode: RegistrationMode
	readonly clubEvent: ClubEvent | null
	readonly registration: Registration | null
	readonly payment: Payment | null
	readonly selectedFees: EventFee[]
	readonly existingFees: Map<string, RegistrationFee> | null // needed for edit mode
	readonly error: Error | null
	readonly currentStep: IRegistrationStep
	readonly stripeClientSession?: string
	readonly correlationId: string
	readonly sseCurrentWave: number | null
}

export const PendingStep: IRegistrationStep = {
	name: "pending",
	order: 0,
	title: "No Registration Started",
}
export const ReserveStep: IRegistrationStep = {
	name: "reserve",
	order: 1,
	title: "Reserve Tee Time or Starting Hole",
}
export const RegisterStep: IRegistrationStep = {
	name: "register",
	order: 2,
	title: "Players and Fees",
}
export const ReviewStep: IRegistrationStep = {
	name: "review",
	order: 3,
	title: "Review Registration Details",
}
export const PaymentStep: IRegistrationStep = {
	name: "payment",
	order: 4,
	title: "Submit Payment",
}
export const CompleteStep: IRegistrationStep = {
	name: "complete",
	order: 5,
	title: "Registration Complete",
}

export type RegistrationAction =
	| { type: "load-event"; payload: { clubEvent: ClubEvent | null; correlationId: string } }
	| {
			type: "load-registration"
			payload: { registration: Registration; payment: Payment; existingFees: RegistrationFee[] }
	  }
	| { type: "create-registration"; payload: { registration: Registration; payment: Payment } }
	| { type: "update-registration"; payload: { registration: Registration } }
	| { type: "update-registration-notes"; payload: { notes: string } }
	| { type: "cancel-registration"; payload: null }
	| { type: "complete-registration"; payload: null }
	| { type: "reset-registration"; payload: { clubEvent: ClubEvent } }
	| { type: "update-payment"; payload: { payment: Payment } }
	| { type: "update-error"; payload: { error: Error | null } }
	| { type: "update-step"; payload: { step: IRegistrationStep } }
	| { type: "add-player"; payload: { slot: RegistrationSlot; player: Player } }
	| { type: "remove-player"; payload: { slotId: number } }
	| { type: "add-fee"; payload: { slotId: number; eventFee: EventFee; player: Player } }
	| { type: "remove-fee"; payload: { slotId: number; eventFeeId: number } }
	| { type: "initiate-stripe-session"; payload: { clientSessionKey: string } }
	| { type: "update-sse-wave"; payload: { wave: number } }

export const defaultRegistrationState: IRegistrationState = {
	mode: "idle",
	clubEvent: null,
	registration: null,
	payment: null,
	selectedFees: [],
	existingFees: null,
	error: null,
	currentStep: PendingStep,
	stripeClientSession: undefined,
	correlationId: "",
	sseCurrentWave: null,
}

export const eventRegistrationReducer = produce((draft, action: RegistrationAction) => {
	const { type, payload } = action
	switch (type) {
		case "load-event": {
			draft.clubEvent = payload.clubEvent
			draft.registration = null
			draft.payment = null
			draft.existingFees = null
			draft.selectedFees = []
			draft.error = null
			draft.mode = "idle"
			draft.currentStep = PendingStep
			draft.correlationId = payload.correlationId
			return
		}
		case "update-step": {
			draft.currentStep = payload.step
			return
		}
		case "load-registration": {
			draft.mode = "edit"
			draft.currentStep = RegisterStep
			draft.registration = payload.registration
			draft.existingFees = new Map(
				payload.existingFees.map((fee) => [`${fee.registrationSlotId}-${fee.eventFeeId}`, fee]),
			)
			draft.payment = payload.payment
			return
		}
		case "create-registration": {
			draft.mode = "new"
			draft.registration = payload.registration
			draft.payment = payload.payment
			draft.currentStep = RegisterStep
			return
		}
		case "update-registration": {
			draft.registration = payload.registration
			draft.error = null
			return
		}
		case "update-registration-notes": {
			if (draft.registration) {
				draft.registration.notes = payload.notes
			}
			return
		}
		case "cancel-registration": {
			draft.registration = null
			draft.payment = null
			draft.existingFees = null
			draft.selectedFees = []
			draft.error = null
			draft.mode = "idle"
			draft.currentStep = PendingStep
			return
		}
		case "complete-registration": {
			draft.registration = null
			draft.payment = null
			draft.existingFees = null
			draft.selectedFees = []
			draft.error = null
			draft.mode = "idle"
			draft.currentStep = CompleteStep
			return
		}
		case "update-payment": {
			draft.payment = payload.payment
			draft.error = null
			return
		}
		case "add-player": {
			const { slot, player } = payload
			const slotToUpdate = draft.registration?.slots.find((s) => s.id === slot.id)
			if (slotToUpdate) {
				slotToUpdate.playerId = player.id
				slotToUpdate.playerName = player.name
			}
			draft.clubEvent?.fees
				.filter((f) => f.isRequired)
				.forEach((fee) => {
					draft.payment?.details.push(
						new PaymentDetail({
							id: 0,
							payment: draft.payment.id,
							event_fee: fee.id,
							registration_slot: slot.id,
							amount: fee.amountDue(player),
						}),
					)
				})
			return
		}
		case "remove-player": {
			const slot = draft.registration?.slots.find((slot) => slot.id === payload.slotId)
			if (slot) {
				slot.playerId = 0
				slot.playerName = undefined
				// remove fees for slot
				if (draft.payment) {
					draft.payment.details = draft.payment?.details.filter((d) => d.slotId !== slot.id)
				}
			}
			return
		}
		case "add-fee": {
			if (draft.payment) {
				draft.payment.details.push(
					new PaymentDetail({
						id: 0,
						payment: draft.payment?.id,
						event_fee: payload.eventFee.id,
						registration_slot: payload.slotId,
						amount: payload.eventFee.amountDue(payload.player),
					}),
				)
			}
			return
		}
		case "remove-fee": {
			if (draft.payment) {
				const index = draft.payment.details.findIndex(
					(p) => p.eventFeeId === payload.eventFeeId && p.slotId === payload.slotId,
				)
				if (index >= 0) {
					draft.payment.details.splice(index, 1)
				}
			}
			return
		}
		case "update-error": {
			draft.error = payload.error
			return
		}
		case "initiate-stripe-session": {
			draft.stripeClientSession = payload.clientSessionKey
			return
		}
		case "update-sse-wave": {
			draft.sseCurrentWave = payload.wave
			return
		}
		default: {
			throw new Error(`Unsupported action type: ${action.type}`)
		}
	}
}, defaultRegistrationState)
