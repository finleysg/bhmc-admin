"use client"

import { useReducer, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert } from "@/components/ui/alert"
import { PageLayout } from "@/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { StepIndicator } from "@/components/ui/step-indicator"
import type {
	CompleteClubEvent,
	Player,
	CompleteRegistration,
	CompleteRegistrationSlot,
	SwapPlayersRequest,
} from "@repo/domain/types"
import { GroupSearch } from "../components/group-search"
import { reducer, initialState } from "./reducer"
import { getStart } from "@repo/domain/functions"

export default function SwapPlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const [state, dispatch] = useReducer(reducer, initialState)
	const [selectedGroupA, setSelectedGroupA] = useState<CompleteRegistration | null>(null)
	const [selectedGroupB, setSelectedGroupB] = useState<CompleteRegistration | null>(null)
	const [validationError, setValidationError] = useState<string | null>(null)

	// Fetch event on mount
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as CompleteClubEvent
					dispatch({ type: "SET_EVENT", payload: eventData })
				} else {
					dispatch({ type: "SET_ERROR", payload: "Failed to fetch event" })
				}
			} catch (err) {
				dispatch({ type: "SET_ERROR", payload: String(err) })
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

	const handleGroupASelected = (group: CompleteRegistration) => {
		setSelectedGroupA(group)
	}

	const handlePlayerASelected = (player: Player, slot: CompleteRegistrationSlot) => {
		if (!selectedGroupA) return
		dispatch({
			type: "SET_PLAYER_A",
			payload: {
				group: selectedGroupA,
				player,
				slot,
			},
		})
	}

	const handleGroupBSelected = (group: CompleteRegistration) => {
		setSelectedGroupB(group)
		setValidationError(null)
	}

	const handlePlayerBSelected = (player: Player, slot: CompleteRegistrationSlot) => {
		if (!selectedGroupB || !state.playerA || !state.groupA) return

		// Validate: different registration
		if (selectedGroupB.id === state.groupA.id) {
			setValidationError("Players must be from different registrations")
			return
		}

		// Validate: not same player
		if (player.id === state.playerA.id) {
			setValidationError("Cannot swap a player with themselves")
			return
		}

		setValidationError(null)
		dispatch({
			type: "SET_PLAYER_B",
			payload: {
				group: selectedGroupB,
				player,
				slot,
			},
		})
	}

	const handleBack = () => {
		dispatch({ type: "GO_BACK" })
		setSelectedGroupA(null)
		setSelectedGroupB(null)
		setValidationError(null)
	}

	const handleReset = () => {
		dispatch({ type: "RESET" })
		setSelectedGroupA(null)
		setSelectedGroupB(null)
		setValidationError(null)
	}

	const handleConfirmSwap = async () => {
		if (!state.slotA || !state.playerA || !state.slotB || !state.playerB || !state.clubEvent) {
			return
		}

		dispatch({ type: "SET_PROCESSING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const requestBody: SwapPlayersRequest = {
				slotAId: state.slotA.id,
				playerAId: state.playerA.id,
				slotBId: state.slotB.id,
				playerBId: state.playerB.id,
				...(state.notes && { notes: state.notes }),
			}

			const response = await fetch(`/api/registration/swap-players?eventId=${state.clubEvent.id}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			})

			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}`
				try {
					const errorData = (await response.json()) as { message?: string }
					if (errorData.message) {
						errorMessage = errorData.message
					}
				} catch {
					// Ignore JSON parse errors
				}
				throw new Error(errorMessage)
			}

			await response.json()
			dispatch({ type: "SET_SUCCESS", payload: true })
		} catch (err) {
			dispatch({ type: "SET_ERROR", payload: String(err) })
		} finally {
			dispatch({ type: "SET_PROCESSING", payload: false })
		}
	}

	// Get players with status R from selected group A
	const registeredPlayersA = selectedGroupA
		? selectedGroupA.slots
				.filter((slot) => slot.status === "R" && slot.player)
				.map((slot) => ({ player: slot.player, slot }))
		: []

	// Get players with status R from selected group B
	const registeredPlayersB = selectedGroupB
		? selectedGroupB.slots
				.filter((slot) => slot.status === "R" && slot.player)
				.map((slot) => ({ player: slot.player, slot }))
		: []

	if (state.isLoading) {
		return <LoadingSpinner size="lg" />
	}

	if (!state.clubEvent) {
		return (
			<div className="flex items-center justify-center p-8">
				<Alert type="error" className="">
					Event not found
				</Alert>
			</div>
		)
	}

	return (
		<PageLayout maxWidth="3xl">
			<Card shadow="xs">
				<CardBody>
					<CardTitle>Swap Players</CardTitle>

					{/* Step 1: Select First Player */}
					{state.step === "playerA" && (
						<div className="mb-6">
							<StepIndicator currentStep={1} totalSteps={3} label="Select first player" />
							<GroupSearch
								key={state.resetKey}
								clubEvent={state.clubEvent}
								onGroupSelected={handleGroupASelected}
								onError={(err) => dispatch({ type: "SET_ERROR", payload: String(err) })}
							/>

							{/* Show players as radio buttons after group selected */}
							{selectedGroupA && registeredPlayersA.length > 0 && (
								<div className="mt-4">
									<p className="text-sm mb-2">Select a player from this group:</p>
									<div className="space-y-2">
										{registeredPlayersA.map(({ player, slot }) => (
											<label
												key={slot.id}
												className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer"
											>
												<input
													type="radio"
													name="playerA"
													className="radio radio-primary"
													onChange={() => handlePlayerASelected(player, slot)}
												/>
												<span>
													{player.firstName} {player.lastName}
												</span>
											</label>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Step 2: Select Second Player */}
					{state.step === "playerB" && (
						<div className="mb-6">
							<StepIndicator currentStep={2} totalSteps={3} label="Select second player" />

							{state.playerA && (
								<div className="mb-4 p-3 bg-base-200 rounded">
									<p className="text-sm">
										<span className="font-semibold">First player:</span> {state.playerA.firstName}{" "}
										{state.playerA.lastName}
									</p>
								</div>
							)}

							<GroupSearch
								key={state.resetKey + "-B"}
								clubEvent={state.clubEvent}
								onGroupSelected={handleGroupBSelected}
								onError={(err) => dispatch({ type: "SET_ERROR", payload: String(err) })}
							/>

							{/* Show players as radio buttons after group selected */}
							{selectedGroupB && registeredPlayersB.length > 0 && (
								<div className="mt-4">
									<p className="text-sm mb-2">Select a player from this group:</p>
									<div className="space-y-2">
										{registeredPlayersB.map(({ player, slot }) => (
											<label
												key={slot.id}
												className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer"
											>
												<input
													type="radio"
													name="playerB"
													className="radio radio-primary"
													onChange={() => handlePlayerBSelected(player, slot)}
												/>
												<span>
													{player.firstName} {player.lastName}
												</span>
											</label>
										))}
									</div>
								</div>
							)}

							{/* Validation error */}
							{validationError && (
								<div className="alert alert-warning mt-4">
									<span>{validationError}</span>
								</div>
							)}

							{/* Navigation buttons */}
							<div className="flex gap-2 mt-6">
								<button type="button" className="btn btn-outline" onClick={handleBack}>
									Back
								</button>
								<button type="button" className="btn btn-ghost" onClick={handleReset}>
									Start Over
								</button>
							</div>
						</div>
					)}

					{/* Step 3: Confirm and Submit */}
					{state.step === "confirm" && !state.swapSuccess && (
						<div className="mb-6">
							<StepIndicator currentStep={3} totalSteps={3} label="Confirm swap" />

							{/* Summary */}
							<div className="space-y-4 mb-6">
								{/* Player A */}
								{state.playerA && state.slotA && state.groupA && state.clubEvent && (
									<div className="p-4 bg-base-200 rounded">
										<p className="font-semibold mb-1">
											{state.playerA.firstName} {state.playerA.lastName}
										</p>
										<p className="text-sm text-gray-600">
											Current: {state.groupA.course?.name || "Course"} •{" "}
											{getStart(state.clubEvent, state.slotA, state.groupA.course?.holes || [])}
										</p>
										{state.slotB && state.groupB && (
											<p className="text-sm text-primary font-medium mt-2">
												→ After swap: {state.groupB.course?.name || "Course"} •{" "}
												{getStart(state.clubEvent, state.slotB, state.groupB.course?.holes || [])}
											</p>
										)}
									</div>
								)}

								{/* Player B */}
								{state.playerB && state.slotB && state.groupB && state.clubEvent && (
									<div className="p-4 bg-base-200 rounded">
										<p className="font-semibold mb-1">
											{state.playerB.firstName} {state.playerB.lastName}
										</p>
										<p className="text-sm text-gray-600">
											Current: {state.groupB.course?.name || "Course"} •{" "}
											{getStart(state.clubEvent, state.slotB, state.groupB.course?.holes || [])}
										</p>
										{state.slotA && state.groupA && (
											<p className="text-sm text-primary font-medium mt-2">
												→ After swap: {state.groupA.course?.name || "Course"} •{" "}
												{getStart(state.clubEvent, state.slotA, state.groupA.course?.holes || [])}
											</p>
										)}
									</div>
								)}
							</div>

							{/* Notes */}
							<div className="form-control mb-6">
								<label className="label">
									<span className="label-text">Notes (optional)</span>
								</label>
								<textarea
									className="textarea textarea-bordered h-24"
									placeholder="Add any notes about this swap..."
									value={state.notes}
									onChange={(e) => dispatch({ type: "SET_NOTES", payload: e.target.value })}
									disabled={state.isProcessing}
								/>
							</div>

							{/* Error display */}
							{state.error && (
								<Alert type="error" className=" mb-4">
									{state.error}
								</Alert>
							)}

							{/* Buttons */}
							<div className="flex gap-2">
								<button
									type="button"
									className="btn btn-outline"
									onClick={handleBack}
									disabled={state.isProcessing}
								>
									Back
								</button>
								<button
									type="button"
									className="btn btn-ghost"
									onClick={handleReset}
									disabled={state.isProcessing}
								>
									Start Over
								</button>
								<button
									type="button"
									className="btn btn-primary ml-auto"
									onClick={() => void handleConfirmSwap()}
									disabled={state.isProcessing}
								>
									{state.isProcessing ? (
										<>
											<span className="loading loading-spinner loading-sm"></span>
											Processing...
										</>
									) : (
										"Confirm Swap"
									)}
								</button>
							</div>
						</div>
					)}

					{/* Success State */}
					{state.swapSuccess && (
						<div className="mb-6">
							<div className="alert alert-success mb-4">
								<span>
									Successfully swapped {state.playerA?.firstName} {state.playerA?.lastName} with{" "}
									{state.playerB?.firstName} {state.playerB?.lastName}
								</span>
							</div>

							<div className="flex gap-2">
								<button type="button" className="btn btn-primary" onClick={handleReset}>
									Swap More
								</button>
								<button
									type="button"
									className="btn btn-outline"
									onClick={() => {
										window.location.href = `/events/${eventId}/players`
									}}
								>
									Player Menu
								</button>
							</div>
						</div>
					)}

					{/* Error display (for non-confirm steps) */}
					{state.error && state.step !== "confirm" && (
						<Alert type="error" className="">
							{state.error}
						</Alert>
					)}
				</CardBody>
			</Card>
		</PageLayout>
	)
}
