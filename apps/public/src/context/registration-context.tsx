import { createContext } from "react"

import { PaymentIntent } from "@stripe/stripe-js"

import { ClubEvent } from "../models/club-event"
import { Course } from "../models/course"
import { EventFee } from "../models/event-fee"
import { Payment } from "../models/payment"
import { Player } from "../models/player"
import { Registration, RegistrationFee, RegistrationSlot } from "../models/registration"
import { IRegistrationStep, RegistrationMode } from "./registration-reducer"

export interface IRegistrationContext {
	clubEvent: ClubEvent | null // TODO: consider removing this from the context
	correlationId: string
	currentStep: IRegistrationStep
	error: Error | null
	existingFees: Map<string, RegistrationFee> | null
	mode: RegistrationMode
	payment: Payment | null
	registration: Registration | null
	selectedFees: EventFee[]
	sseCurrentWave: number | null
	stripeClientSession?: string
	addFee: (slot: RegistrationSlot, eventFee: EventFee, player: Player) => void
	addPlayer: (slot: RegistrationSlot, player: Player) => void
	cancelRegistration: (
		reason: "user" | "timeout" | "navigation" | "violation",
		mode: RegistrationMode,
	) => Promise<void>
	canRegister: () => boolean
	completeRegistration: () => void
	createPaymentIntent: () => Promise<PaymentIntent>
	createRegistration: (
		course?: Course,
		slots?: RegistrationSlot[],
		selectedStart?: string,
	) => Promise<void>
	initiateStripeSession: () => void
	editRegistration: (registrationId: number, playerIds: number[]) => Promise<void>
	loadRegistration: (player: Player) => Promise<void>
	removeFee: (slot: RegistrationSlot, eventFee: EventFee) => void
	removePlayer: (slot: RegistrationSlot) => void
	savePayment: () => Promise<void>
	setError: (error: Error | null) => void
	updateRegistrationNotes: (notes: string) => Promise<void>
	updateStep: (step: IRegistrationStep) => void
}

export const EventRegistrationContext = createContext<IRegistrationContext | null>(null)
EventRegistrationContext.displayName = "EventRegistrationContext"
