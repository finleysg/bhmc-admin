"use client"

import { createContext, useContext } from "react"

import type { Course, EventFee } from "../types"
import type { FeePlayer } from "./fee-utils"
import type { RegistrationStep, SelectedSession } from "./registration-reducer"
import type {
	RegistrationMode,
	ServerPayment,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
} from "./types"

export interface IRegistrationContext {
	// State
	clubEvent: import("../types").ClubEventDetail | null
	correlationId: string
	currentStep: RegistrationStep
	error: string | null
	existingFees: Map<string, ServerRegistrationFee> | null
	mode: RegistrationMode
	payment: ServerPayment | null
	registration: ServerRegistration | null
	selectedSession: SelectedSession | null
	selectedStart: string | null
	sseConnected: boolean
	sseCurrentWave: number | null
	stripeClientSession?: string

	// Actions
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
	loadRegistration: (playerId: number) => Promise<void>
	selectSession: (session: SelectedSession) => void
	startEditRegistration: (registration: ServerRegistration) => void
	removeFee: (slot: ServerRegistrationSlot, eventFee: EventFee) => void
	removePlayer: (slot: ServerRegistrationSlot) => void
	requestNavigation: (href: string) => void
	savePayment: () => Promise<ServerPayment | undefined>
	suppressBeforeUnload: () => void
	setError: (error: string | null) => void
	updateRegistrationNotes: (notes: string) => Promise<void>
	updateStep: (step: RegistrationStep) => void
}

export const RegistrationContext = createContext<IRegistrationContext | null>(null)
RegistrationContext.displayName = "RegistrationContext"

export function useRegistration() {
	const context = useContext(RegistrationContext)
	if (!context) {
		throw new Error("useRegistration must be used within a RegistrationProvider")
	}
	return context
}
