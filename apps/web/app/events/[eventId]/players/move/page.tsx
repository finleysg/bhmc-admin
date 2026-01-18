"use client"

import { useReducer, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { GroupSearch } from "../components/group-search"
import { SelectPlayers } from "../components/select-players"
import type { CompleteClubEvent, Player } from "@repo/domain/types"
import { reducer, initialState } from "./reducer"

/**
 * Move Player page for a club event, allowing selection of a registration group, choosing player(s) to move, selecting destination, and confirming the move.
 */
export default function MovePlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const router = useRouter()
	const [state, dispatch] = useReducer(reducer, initialState)
	const resultRef = useRef<HTMLDivElement>(null)

	// Scroll to result on success or error
	useEffect(() => {
		if (state.moveSuccess || state.error) {
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
		}
	}, [state.moveSuccess, state.error])

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
				dispatch({
					type: "SET_ERROR",
					payload: err instanceof Error ? err.message : "Unknown error",
				})
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

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
						<h3 className="card-title text-secondary font-semibold mb-4">Move Player</h3>

						{/* Step 1: Select Group */}
						{state.step === "group" && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 1 of 4: Select Group</h4>
								<GroupSearch
									key={state.resetKey}
									clubEvent={state.clubEvent}
									onGroupSelected={(group) => dispatch({ type: "SET_GROUP", payload: group })}
									onError={(err) =>
										dispatch({
											type: "SET_ERROR",
											payload: err instanceof Error ? err.message : "Unknown error",
										})
									}
								/>
							</div>
						)}

						{/* Step 2: Select Players */}
						{state.step === "player" && state.sourceGroup && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 2 of 4: Select Player(s) to Move</h4>
								<SelectPlayers
									group={state.sourceGroup}
									selectedPlayers={state.selectedPlayers}
									onSelect={(player: Player) => {
										const slot = state.sourceGroup?.slots.find((s) => s.playerId === player.id)
										if (slot) {
											dispatch({ type: "SELECT_PLAYER", payload: { player, slot } })
										}
									}}
									onRemove={(player: Player) => {
										dispatch({ type: "REMOVE_PLAYER", payload: player.id })
									}}
								/>
								<div className="flex justify-around gap-2 mt-4">
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
										className="btn btn-primary btn-sm"
										disabled={state.selectedPlayers.length === 0}
										onClick={() =>
											dispatch({
												type: "SET_DESTINATION_COURSE",
												payload: state.sourceGroup?.courseId ?? 0,
											})
										}
									>
										Continue →
									</button>
								</div>
							</div>
						)}

						{/* Placeholder for future steps */}
						{(state.step === "destination" || state.step === "confirm") && (
							<div className="mb-6">
								<p className="text-sm text-base-content/70">Step {state.step} - Coming soon</p>
								<button
									className="btn btn-ghost btn-sm mt-4"
									onClick={() => dispatch({ type: "GO_BACK" })}
								>
									← Back
								</button>
							</div>
						)}

						<div ref={resultRef}>
							{state.moveSuccess && (
								<div className="mt-6">
									<div className="text-success mb-6">Players moved successfully!</div>
									<div>
										<button
											className="btn btn-success me-2"
											onClick={() => dispatch({ type: "RESET" })}
										>
											Move More
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

							{state.error != null && (
								<div className="mb-6">
									<h4 className="font-semibold mb-2 text-error">Unhandled Error</h4>
									<div className="alert alert-error text-xs mb-2">
										<span className="text-wrap">
											Error: {typeof state.error === "string" ? state.error : "Unknown error"}
										</span>
									</div>
									<button
										className="btn btn-neutral"
										onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
									>
										Try Again
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
