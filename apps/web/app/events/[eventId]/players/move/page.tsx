"use client"

import { useReducer, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { GroupSearch } from "../components/group-search"
import { SelectPlayers } from "../components/select-players"
import { SelectAvailable } from "../components/select-available"
import type { CompleteClubEvent, Player, AvailableSlotGroup, Course } from "@repo/domain/types"
import { getStart } from "@repo/domain/functions"
import { reducer, initialState } from "./reducer"

function findCourseByHoleId(courses: Course[], holeId: number): Course | undefined {
	return courses.find((c) => c.holes?.some((h) => h.id === holeId))
}

/**
 * Move Player page for a club event, allowing selection of a registration group, choosing player(s) to move, selecting destination, and confirming the move.
 */
export default function MovePlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const router = useRouter()
	const [state, dispatch] = useReducer(reducer, initialState)
	const resultRef = useRef<HTMLDivElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	// Scroll to result on success or error
	useEffect(() => {
		if (state.moveSuccess || state.error) {
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
		}
	}, [state.moveSuccess, state.error])

	const handleConfirmMove = (): void => {
		const destGroup = state.destinationSlotGroup
		if (!destGroup || state.selectedSourceSlots.length === 0) return

		// Cancel any ongoing request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		const controller = new AbortController()
		abortControllerRef.current = controller

		dispatch({ type: "SET_PROCESSING", payload: true })

		void (async () => {
			try {
				const response = await fetch(`/api/registration/move-players?eventId=${eventId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sourceSlotIds: state.selectedSourceSlots.map((s) => s.id),
						destinationStartingHoleId: destGroup.holeId,
						destinationStartingOrder: destGroup.startingOrder,
						notes: state.notes || undefined,
					}),
					signal: controller.signal,
				})

				if (!response.ok) {
					const errorBody = await response.text()
					throw new Error(`Failed to move players: ${errorBody}`)
				}

				if (!controller.signal.aborted) {
					dispatch({ type: "SET_SUCCESS", payload: true })
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return
				}
				if (!controller.signal.aborted) {
					dispatch({
						type: "SET_ERROR",
						payload: err instanceof Error ? err.message : "Unknown error",
					})
				}
			} finally {
				if (!controller.signal.aborted) {
					dispatch({ type: "SET_PROCESSING", payload: false })
				}
			}
		})()
	}

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

						{/* Step 3: Select Destination */}
						{state.step === "destination" && state.clubEvent && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 3 of 4: Select Destination</h4>
								<p className="text-sm text-base-content/70 mb-4">
									Moving:{" "}
									{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
								</p>
								<SelectAvailable
									players={state.selectedPlayers.length}
									courses={state.clubEvent.courses ?? []}
									clubEvent={state.clubEvent}
									onSlotSelect={(slotIds: number[], group?: AvailableSlotGroup) => {
										if (group) {
											dispatch({ type: "SET_DESTINATION_SLOTS", payload: group })
										}
									}}
									onError={(err) =>
										dispatch({
											type: "SET_ERROR",
											payload: err instanceof Error ? err.message : "Unknown error",
										})
									}
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
								</div>
							</div>
						)}

						{/* Step 4: Confirm */}
						{state.step === "confirm" &&
							!state.moveSuccess &&
							state.sourceGroup &&
							state.destinationSlotGroup && (
								<div className="mb-6">
									<h4 className="font-semibold mb-2">Step 4 of 4: Confirm Move</h4>

									{/* Summary */}
									<div className="mb-4">
										<p className="mb-2">
											<strong>Players:</strong>{" "}
											{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
										</p>
										<p className="mb-2">
											<strong>From:</strong> {state.sourceGroup.course?.name} -{" "}
											{state.sourceGroup.course?.holes
												? getStart(
														state.clubEvent,
														state.sourceGroup.slots[0],
														state.sourceGroup.course.holes,
													)
												: "Unknown"}
										</p>
										<p className="mb-2">
											<strong>To:</strong>{" "}
											{(() => {
												const destCourse = findCourseByHoleId(
													state.clubEvent.courses ?? [],
													state.destinationSlotGroup.holeId,
												)
												return destCourse?.holes
													? `${destCourse.name} - ${getStart(state.clubEvent, state.destinationSlotGroup.slots[0], destCourse.holes)}`
													: "Unknown"
											})()}
										</p>
									</div>

									{/* Optional notes */}
									<div className="form-control mb-4">
										<label className="label">
											<span className="label-text">Notes (optional)</span>
										</label>
										<textarea
											className="textarea textarea-bordered"
											placeholder="Add any notes about this move..."
											value={state.notes}
											onChange={(e) => dispatch({ type: "SET_NOTES", payload: e.target.value })}
											disabled={state.isProcessing}
										/>
									</div>

									<div className="flex gap-2 mt-4 justify-between">
										<button
											className="btn btn-ghost btn-sm"
											onClick={() => dispatch({ type: "GO_BACK" })}
											disabled={state.isProcessing}
										>
											← Back
										</button>
										<button
											className="btn btn-ghost btn-sm"
											onClick={() => dispatch({ type: "RESET" })}
											disabled={state.isProcessing}
										>
											Start Over
										</button>
										<button
											className="btn btn-primary btn-sm"
											onClick={handleConfirmMove}
											disabled={state.isProcessing}
										>
											{state.isProcessing ? (
												<>
													<span className="loading loading-spinner loading-sm"></span>
													Processing...
												</>
											) : (
												"Confirm Move"
											)}
										</button>
									</div>
								</div>
							)}

						<div ref={resultRef}>
							{state.moveSuccess && (
								<div className="mt-6">
									<div className="text-success mb-6">
										Moved{" "}
										{state.selectedPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}{" "}
										successfully!
									</div>
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
