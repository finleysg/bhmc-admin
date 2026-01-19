"use client"

import { useReducer, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type {
	CompleteClubEvent,
	Player,
	CompleteRegistration,
	CompleteRegistrationSlot,
} from "@repo/domain/types"
import { GroupSearch } from "../components/group-search"
import { reducer, initialState } from "./reducer"

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
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!state.clubEvent) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="alert alert-error">Event not found</div>
			</div>
		)
	}

	return (
		<main className="min-h-screen flex justify-center md:p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xs">
					<div className="card-body">
						<h3 className="card-title text-secondary font-semibold mb-4">Swap Players</h3>

						{/* Step 1: Select First Player */}
						{state.step === "playerA" && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 1 of 3: Select first player</h4>
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
								<h4 className="font-semibold mb-2">Step 2 of 3: Select second player</h4>

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

						{/* Error display */}
						{state.error && (
							<div className="alert alert-error">
								<span>{state.error}</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
