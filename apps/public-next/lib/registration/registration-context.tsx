"use client"

import { createContext, useContext } from "react"

import type { ClubEventDetail, Course, EventFee } from "../types"
import type { FeePlayer } from "./fee-utils"
import type { RegistrationStep } from "./registration-reducer"
import type {
	RegistrationMode,
	ServerPayment,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
} from "./types"

export interface IRegistrationStateContext {
	clubEvent: ClubEventDetail | null
	correlationId: string
	currentStep: RegistrationStep
	error: string | null
	existingFees: Map<string, ServerRegistrationFee> | null
	mode: RegistrationMode
	payment: ServerPayment | null
	registration: ServerRegistration | null
	sseCurrentWave: number | null
	stripeClientSession?: string
}

export interface IRegistrationActionsContext {
	addFee: (slot: ServerRegistrationSlot, eventFee: EventFee, player: FeePlayer) => void
	addPlayer: (
		slot: ServerRegistrationSlot,
		playerId: number,
		playerName: string,
		player: FeePlayer,
	) => void
	cancelRegistration: (
		reason: "user" | "timeout" | "navigation" | "violation",
		mode: RegistrationMode,
	) => Promise<void>
	canRegister: () => boolean
	completeRegistration: () => void
	createPaymentIntent: () => Promise<{ client_secret: string }>
	createRegistration: (
		course?: Course,
		slots?: { id: number }[],
		selectedStart?: string,
	) => Promise<void>
	editRegistration: (registrationId: number, playerIds: number[]) => Promise<void>
	initiateStripeSession: () => void
	loadRegistration: (playerId: number, paymentId?: number) => Promise<void>
	removeFee: (slot: ServerRegistrationSlot, eventFee: EventFee) => void
	removePlayer: (slot: ServerRegistrationSlot) => void
	savePayment: () => Promise<void>
	setError: (error: string | null) => void
	updateRegistrationNotes: (notes: string) => Promise<void>
	updateStep: (step: RegistrationStep) => void
}

export type IRegistrationContext = IRegistrationStateContext & IRegistrationActionsContext

export const RegistrationStateContext = createContext<IRegistrationStateContext | null>(null)
RegistrationStateContext.displayName = "RegistrationStateContext"

export const RegistrationActionsContext = createContext<IRegistrationActionsContext | null>(null)
RegistrationActionsContext.displayName = "RegistrationActionsContext"

export function useRegistration(): IRegistrationContext {
	const state = useContext(RegistrationStateContext)
	const actions = useContext(RegistrationActionsContext)
	if (!state || !actions) {
		throw new Error("useRegistration must be used within a RegistrationProvider")
	}
	return { ...state, ...actions }
}

export function useRegistrationActions(): IRegistrationActionsContext {
	const actions = useContext(RegistrationActionsContext)
	if (!actions) {
		throw new Error("useRegistrationActions must be used within a RegistrationProvider")
	}
	return actions
}
