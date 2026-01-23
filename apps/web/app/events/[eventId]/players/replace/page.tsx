"use client"

import { useReducer, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import type { CompleteClubEvent, ReplacePlayerRequest } from "@repo/domain/types"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { reducer, initialState } from "./reducer"
import { GroupSearch } from "../components/group-search"
import { PlayerSearch } from "../components/player-search"

export default function ReplacePlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const router = useRouter()
	const [state, dispatch] = useReducer(reducer, initialState)
	const abortControllerRef = useRef<AbortController | null>(null)
	const resultRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	useEffect(() => {
		if (state.replaceSuccess || state.error) {
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
		}
	}, [state.replaceSuccess, state.error])

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
				dispatch({ type: "SET_ERROR", payload: err })
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

	const handleReplace = async () => {
		if (!state.originalSlot || !state.replacementPlayer) return

		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		const controller = new AbortController()
		abortControllerRef.current = controller

		dispatch({ type: "SET_PROCESSING", payload: true })

		try {
			const requestBody: ReplacePlayerRequest = {
				slotId: state.originalSlot.id,
				originalPlayerId: state.originalSlot.playerId!,
				replacementPlayerId: state.replacementPlayer.id,
				notes: state.notes || undefined,
			}

			const response = await fetch(`/api/registration/replace-player?eventId=${eventId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			})

			if (!response.ok) {
				const errorBody = await response.text()
				throw new Error(`Failed to replace player: ${errorBody}`)
			}

			await response.json()

			if (!controller.signal.aborted) {
				dispatch({ type: "SET_SUCCESS", payload: true })
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") {
				return
			}
			if (!controller.signal.aborted) {
				dispatch({ type: "SET_ERROR", payload: err })
			}
		}
	}

	if (state.isLoading) {
		return <LoadingSpinner size="lg" />
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
						<h3 className="card-title text-secondary font-semibold mb-4">Replace Player</h3>

						{state.step === "group" && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 1 of 4: Select Group</h4>
								<GroupSearch
									clubEvent={state.clubEvent}
									onGroupSelected={(group) => dispatch({ type: "SET_GROUP", payload: group })}
									onError={(err) => dispatch({ type: "SET_ERROR", payload: err })}
								/>
							</div>
						)}

						{state.step === "player" && state.selectedGroup && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 2 of 4: Select Player to Replace</h4>
								<p className="text-sm text-base-content/70 mb-4">
									Selected group: {state.selectedGroup.slots[0]?.player?.firstName}{" "}
									{state.selectedGroup.slots[0]?.player?.lastName}
								</p>
								<div className="space-y-2">
									{state.selectedGroup.slots
										.filter((slot) => slot.player && slot.status === "R")
										.map((slot) => (
											<label
												key={slot.id}
												className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-base-200"
											>
												<input
													type="radio"
													name="originalPlayer"
													className="radio radio-primary"
													onChange={() =>
														dispatch({
															type: "SET_ORIGINAL_PLAYER",
															// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
															payload: { player: slot.player!, slot },
														})
													}
												/>
												<div>
													<div className="font-medium">
														{slot.player?.firstName} {slot.player?.lastName}
													</div>
													<div className="text-sm text-base-content/70">
														Slot {slot.slot} - Starting Order {slot.startingOrder}
													</div>
												</div>
											</label>
										))}
								</div>
								<div className="flex gap-2 mt-4">
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

						{state.step === "replacement" && state.originalPlayer && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 3 of 4: Select Replacement Player</h4>
								<p className="text-sm text-base-content/70 mb-4">
									Replacing: {state.originalPlayer.firstName} {state.originalPlayer.lastName}
								</p>
								<PlayerSearch
									eventId={state.clubEvent.id}
									excludeRegistered={true}
									onPlayerSelected={(player) =>
										dispatch({ type: "SET_REPLACEMENT_PLAYER", payload: player })
									}
									onPlayerRemoved={() => {}}
									onError={(err) => dispatch({ type: "SET_ERROR", payload: err })}
								/>
								<div className="flex gap-2 mt-4">
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

						{state.step === "confirm" &&
							state.originalPlayer &&
							state.replacementPlayer &&
							state.originalSlot && (
								<div className="mb-6">
									<h4 className="font-semibold mb-2">Step 4 of 4: Confirm Replacement</h4>
									<div className="bg-base-200 p-4 rounded mb-4">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<div className="text-sm text-base-content/70">Original Player</div>
												<div className="font-medium">
													{state.originalPlayer.firstName} {state.originalPlayer.lastName}
												</div>
											</div>
											<div>
												<div className="text-sm text-base-content/70">Replacement Player</div>
												<div className="font-medium">
													{state.replacementPlayer.firstName} {state.replacementPlayer.lastName}
												</div>
											</div>
										</div>
									</div>

									<div className="form-control mb-4">
										<label className="label">
											<span className="label-text">Notes (optional)</span>
										</label>
										<textarea
											className="textarea textarea-bordered"
											placeholder="Add any notes about this replacement..."
											value={state.notes}
											onChange={(e) => dispatch({ type: "SET_NOTES", payload: e.target.value })}
											disabled={state.isProcessing}
										/>
									</div>

									<div className="flex gap-2 items-center">
										<button
											className="btn btn-primary"
											onClick={() => void handleReplace()}
											disabled={state.isProcessing}
										>
											{state.isProcessing && <span className="loading loading-spinner"></span>}
											Confirm
										</button>
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
									</div>
								</div>
							)}

						{state.replaceSuccess && (
							<div ref={resultRef} className="mt-6">
								<div className="text-success mb-6">
									Replaced {state.originalPlayer?.firstName} {state.originalPlayer?.lastName} with{" "}
									{state.replacementPlayer?.firstName} {state.replacementPlayer?.lastName}{" "}
									successfully!
								</div>
								<div>
									<button
										className="btn btn-success me-2"
										onClick={() => dispatch({ type: "RESET" })}
									>
										Replace More
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
							<div ref={resultRef} className="mb-6">
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
		</main>
	)
}
