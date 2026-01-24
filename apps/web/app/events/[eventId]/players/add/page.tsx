"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"

import { useParams, useRouter } from "next/navigation"

import { AdminRegistrationOptions } from "@/components/admin-registration-options"
import { EventFeePicker } from "@/app/events/[eventId]/players/components/event-fee-picker"
import { PlayerSearch } from "@/app/events/[eventId]/players/components/player-search"
import { SelectAvailable } from "@/app/events/[eventId]/players/components/select-available"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert } from "@/components/ui/alert"
import { PageLayout } from "@/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { StepIndicator } from "@/components/ui/step-indicator"
import { HelperText } from "@/components/ui/helper-text"
import { parseLocalDate } from "@repo/domain/functions"
import {
	RegistrationTypeChoices,
	type AvailableSlotGroup,
	type CompleteClubEvent as ClubEvent,
	type Player,
} from "@repo/domain/types"

import { reducer, getInitialState, type AddPlayerStep } from "./reducer"

export default function AddPlayerPage() {
	const { user, isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const { eventId } = useParams<{ eventId: string }>()
	const router = useRouter()

	const [state, dispatch] = useReducer(reducer, getInitialState())
	const resultRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (user) {
			dispatch({
				type: "SET_USER",
				payload: {
					signedUpBy: `${user.firstName} ${user.lastName}`.trim() || "Admin",
				},
			})
		}
	}, [user])

	// Fetch event details
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as ClubEvent
					dispatch({ type: "SET_EVENT", payload: eventData })
				} else {
					console.error("Failed to fetch event")
				}
			} catch (error) {
				console.error("Error fetching event:", error)
			} finally {
				dispatch({ type: "SET_IS_LOADING", payload: false })
			}
		}

		if (signedIn && !isPending) {
			void fetchEvent()
		}
	}, [signedIn, isPending, eventId])

	const handlePlayerSelected = (player: Player) => {
		dispatch({ type: "ADD_PLAYER", payload: player })
	}

	const handlePlayerRemoved = (player: Player) => {
		dispatch({ type: "REMOVE_PLAYER", payload: player })
	}

	const handleSlotSelect = (slotIds: number[], group?: AvailableSlotGroup) => {
		dispatch({ type: "SELECT_SLOTS", payload: { slotIds, group } })
	}

	const handleFeeChange = useCallback((selections: { playerId: number; eventFeeId: number }[]) => {
		dispatch({ type: "SET_FEES", payload: selections })
	}, [])

	const handleError = useCallback((err: unknown) => {
		dispatch({ type: "SET_ERROR", payload: err })
	}, [])

	useEffect(() => {
		if (state.completeSuccess || state.error) {
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
		}
	}, [state.completeSuccess, state.error])

	const handleCompleteRegistration = async () => {
		console.log("Completing registration with state:", state)

		dispatch({ type: "SET_IS_LOADING", payload: true })

		try {
			const dto = state.adminRegistration

			const response = await fetch(`/api/registration/${eventId}/admin-registration`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(dto),
			})

			if (response.ok) {
				dispatch({ type: "SET_COMPLETE_SUCCESS", payload: true })
			} else {
				dispatch({ type: "SET_ERROR", payload: "Failed to complete registration" })
			}
		} catch (err) {
			dispatch({ type: "SET_ERROR", payload: err })
		} finally {
			dispatch({ type: "SET_IS_LOADING", payload: false })
		}
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	const membersOnly = state.event?.registrationType === RegistrationTypeChoices.MEMBER
	const canChoose = state.event?.canChoose ?? false
	const totalSteps = canChoose ? 4 : 3

	const getStepNumber = (step: AddPlayerStep): number => {
		if (canChoose) {
			const stepOrder: AddPlayerStep[] = ["player", "slot", "fee", "confirm"]
			return stepOrder.indexOf(step) + 1
		}
		const stepOrder: AddPlayerStep[] = ["player", "fee", "confirm"]
		return stepOrder.indexOf(step) + 1
	}

	const stepNumber = getStepNumber(state.step)

	return (
		<PageLayout maxWidth="3xl">
			<Card shadow="xs">
				<CardBody>
					<CardTitle>Add Player</CardTitle>

					{state.step === "player" && (
						<div className="mb-6">
							<StepIndicator
								currentStep={stepNumber}
								totalSteps={totalSteps}
								label="Select Players"
							/>
							<PlayerSearch
								eventId={Number(eventId)}
								initialSelectedPlayers={state.selectedPlayers}
								membersOnly={membersOnly}
								onPlayerSelected={handlePlayerSelected}
								onPlayerRemoved={handlePlayerRemoved}
								onError={handleError}
							/>
							<div className="flex gap-2 mt-4 justify-end">
								<button
									type="button"
									className="btn btn-primary btn-sm"
									disabled={state.selectedPlayers.length === 0}
									onClick={() => dispatch({ type: "NEXT_STEP" })}
								>
									Continue →
								</button>
							</div>
						</div>
					)}

					{state.step === "slot" && state.event && (
						<div className="mb-6">
							<StepIndicator
								currentStep={stepNumber}
								totalSteps={totalSteps}
								label="Find an Open Spot"
							/>
							<HelperText>
								Players:{" "}
								{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
							</HelperText>
							<SelectAvailable
								players={state.selectedPlayers.length}
								courses={state.event.courses ?? []}
								clubEvent={state.event}
								onError={handleError}
								onSlotSelect={handleSlotSelect}
							/>
							<div className="flex gap-2 mt-4 justify-between">
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "GO_BACK" })}
								>
									← Back
								</button>
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "RESET" })}
								>
									Start Over
								</button>{" "}
								{state.selectedSlotGroup && (
									<button
										type="button"
										className="btn btn-primary btn-sm"
										onClick={() => dispatch({ type: "NEXT_STEP" })}
									>
										Continue →
									</button>
								)}
							</div>
						</div>
					)}

					{state.step === "fee" && (
						<div className="mb-6">
							<StepIndicator currentStep={stepNumber} totalSteps={totalSteps} label="Select Fees" />
							<HelperText>
								Players:{" "}
								{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
							</HelperText>
							{state.event?.eventFees && (
								<EventFeePicker
									fees={state.event.eventFees}
									players={state.selectedPlayers}
									onChange={handleFeeChange}
									eventDate={parseLocalDate(state.event.startDate)}
								/>
							)}
							<div className="flex gap-2 mt-4 justify-between">
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "GO_BACK" })}
								>
									← Back
								</button>
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "RESET" })}
								>
									Start Over
								</button>
								<button
									type="button"
									className="btn btn-primary btn-sm"
									onClick={() => dispatch({ type: "NEXT_STEP" })}
								>
									Continue →
								</button>
							</div>
						</div>
					)}

					{state.step === "confirm" && (
						<div className="mb-6">
							<StepIndicator
								currentStep={stepNumber}
								totalSteps={totalSteps}
								label="Payment Options"
							/>
							<HelperText>
								Players:{" "}
								{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
							</HelperText>
							<AdminRegistrationOptions
								options={state.registrationOptions}
								onChange={(opts) => dispatch({ type: "SET_REGISTRATION_OPTIONS", payload: opts })}
							/>

							<div className="flex gap-2 items-center mt-4 justify-between">
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "GO_BACK" })}
									disabled={state.isLoading}
								>
									← Back
								</button>
								<button
									className="btn btn-ghost btn-sm"
									onClick={() => dispatch({ type: "RESET" })}
									disabled={state.isLoading}
								>
									Start Over
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => void handleCompleteRegistration()}
									disabled={state.isLoading}
								>
									{state.isLoading ? (
										<>
											<span className="loading loading-spinner loading-sm"></span>
											Completing...
										</>
									) : (
										"Complete →"
									)}
								</button>
							</div>
						</div>
					)}

					<div ref={resultRef}>
						{state.completeSuccess && (
							<div className="mt-6">
								<div className="text-success mb-6">
									Added{" "}
									{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}{" "}
									successfully!
								</div>
								<div>
									<button
										className="btn btn-success me-2"
										onClick={() => dispatch({ type: "RESET" })}
									>
										Add More
									</button>
									<button
										className="btn btn-neutral"
										onClick={() => router.push(`/events/${eventId}/players`)}
									>
										Player Menu
									</button>
								</div>
							</div>
						)}

						{state.error && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2 text-error">Unhandled Error</h4>{" "}
								<Alert type="error" className="text-xs mb-2">
									Error: {JSON.stringify(state.error)}
								</Alert>
								<button
									className="btn btn-neutral"
									onClick={() => {
										dispatch({ type: "RESET_ERROR" })
									}}
								>
									Try Again
								</button>
							</div>
						)}
					</div>
				</CardBody>
			</Card>
		</PageLayout>
	)
}
