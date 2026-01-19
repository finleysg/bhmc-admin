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

	// Get players with status R from selected group
	const registeredPlayers = selectedGroupA
		? selectedGroupA.slots
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
								{selectedGroupA && registeredPlayers.length > 0 && (
									<div className="mt-4">
										<p className="text-sm mb-2">Select a player from this group:</p>
										<div className="space-y-2">
											{registeredPlayers.map(({ player, slot }) => (
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
