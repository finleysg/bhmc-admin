"use client"

import { useReducer, useEffect, useMemo, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { GroupSearch } from "../components/group-search"
import SelectPlayers from "../components/select-players"
import type { CompleteClubEvent } from "@repo/domain/types"
import { reducer, initialState, translateRefundRequests } from "./reducer"
import { PaidFeePicker } from "../components/paid-fee-picker"

/**
 * Render the Drop Player page for a club event, allowing selection of a registration group, choosing player(s) to drop, and selecting fees to refund.
 *
 * @returns The React element for the Drop Player page
 */

export default function DropPlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const router = useRouter()
	const [state, dispatch] = useReducer(reducer, initialState)
	const abortControllerRef = useRef<AbortController | null>(null)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	const handleCompleteDrop = (): void => {
		const { selectedGroup, selectedPlayers, selectedFees } = state
		if (!selectedGroup || selectedPlayers.length === 0) return

		// Cancel any ongoing request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		const controller = new AbortController()
		abortControllerRef.current = controller

		dispatch({ type: "SET_PROCESSING", payload: true })

		void (async () => {
			try {
				// Step 1: Drop players
				const slotIds: number[] = selectedGroup.slots
					.filter((slot) => selectedPlayers.some((p) => p.id === slot.player.id))
					.map((slot) => slot.id)

				const dropResponse = await fetch(
					`/api/registration/drop-players?registrationId=${state.selectedGroup?.id}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(slotIds),
						signal: controller.signal,
					},
				)

				if (!dropResponse.ok) {
					const errorBody = await dropResponse.text()
					throw new Error(`Failed to drop players: ${errorBody}`)
				}

				// Step 2: Process refunds (if any fees selected)
				if (state.selectedFees.length > 0) {
					// compute refundRequests from the captured snapshot to avoid stale-narrowing
					const snapshotState = { ...state, selectedGroup, selectedPlayers, selectedFees }
					const refundRequests = translateRefundRequests(snapshotState)

					const refundResponse = await fetch("/api/registration/refund", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(refundRequests),
						signal: controller.signal,
					})

					if (!refundResponse.ok) {
						const errorBody = await refundResponse.text()
						throw new Error(`Failed to process refunds: ${errorBody}`)
					}
				}

				if (!controller.signal.aborted) {
					dispatch({ type: "SET_DROP_SUCCESS", payload: true })
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return
				}
				if (!controller.signal.aborted) {
					dispatch({ type: "SET_ERROR", payload: err })
				}
			} finally {
				if (!controller.signal.aborted) {
					dispatch({ type: "SET_PROCESSING", payload: false })
				}
			}
		})()
	}

	const slots = useMemo(
		() =>
			state.selectedGroup
				? state.selectedGroup.slots.filter(
						(slot) => slot.player && state.selectedPlayers.some((p) => p.id === slot.player.id),
					)
				: [],
		[state.selectedGroup, state.selectedPlayers],
	)

	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					// We only return validated club events to the UI
					const eventData = (await response.json()) as CompleteClubEvent
					dispatch({ type: "SET_EVENT", payload: eventData })
				} else {
					dispatch({ type: "SET_ERROR", payload: "Failed to fetch event" })
				}
			} catch (err) {
				dispatch({ type: "SET_ERROR", payload: err })
			} finally {
				dispatch({ type: "SET_LOADING", payload: false })
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

	const handleFeesChange = useCallback(
		(selections: { slotId: number; registrationFeeIds: number[] }[]) => {
			dispatch({ type: "SET_FEES", payload: selections })
		},
		[dispatch],
	)

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
						<h3 className="card-title text-secondary font-semibold mb-4">Drop Player</h3>
						<div className="mb-6">
							<h4 className="font-semibold mb-2">Select Group</h4>
							<GroupSearch
								clubEvent={state.clubEvent}
								onGroupSelected={(group) => dispatch({ type: "SET_GROUP", payload: group })}
								onError={(err) => dispatch({ type: "SET_ERROR", payload: err })}
							/>
						</div>
						{state.selectedGroup && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Player(s) to Drop</h4>
								<SelectPlayers
									group={state.selectedGroup}
									selectedPlayers={state.selectedPlayers}
									onSelect={(player) => dispatch({ type: "SELECT_PLAYER", payload: player })}
									onRemove={(player) => dispatch({ type: "REMOVE_PLAYER", payload: player })}
								/>
							</div>
						)}
						{state.selectedPlayers.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Fees to Refund</h4>
								<PaidFeePicker
									clubEvent={state.clubEvent}
									slots={slots}
									onChange={handleFeesChange}
								/>
							</div>
						)}

						{state.selectedPlayers.length > 0 && !state.dropSuccess && (
							<div className="mb-6">
								<button
									type="button"
									className="btn btn-primary"
									onClick={handleCompleteDrop}
									disabled={state.isProcessing}
								>
									{state.isProcessing ? (
										<>
											<span className="loading loading-spinner loading-sm"></span>
											Processing...
										</>
									) : (
										"Complete Drop"
									)}
								</button>
							</div>
						)}
						{state.dropSuccess && (
							<div className="mt-6">
								<div className="text-success mb-6">Players dropped and refunds processed!</div>
								<div>
									<button
										className="btn btn-success me-2"
										onClick={() => dispatch({ type: "RESET_SELECTIONS" })}
									>
										Drop More
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

						{state.error !== undefined && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2 text-error">Unhandled Error</h4>
								<div className="alert alert-error text-xs mb-2">
									<span className="text-wrap">
										Error: {typeof state.error === "string" ? state.error : "Unknown error"}
									</span>
								</div>
								<button
									className="btn btn-neutral"
									onClick={() => dispatch({ type: "RESET_ERROR" })}
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
