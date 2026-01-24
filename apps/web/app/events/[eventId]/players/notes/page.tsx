"use client"

import { useReducer, useEffect } from "react"
import { useParams } from "next/navigation"
import type { CompleteClubEvent, CompleteRegistration } from "@repo/domain/types"
import { getStart } from "@repo/domain/functions"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
import { GroupSearch } from "../components/group-search"
import { reducer, initialState } from "./reducer"

export default function NotesPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const [state, dispatch] = useReducer(reducer, initialState)

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

	const handleGroupSelected = (group: CompleteRegistration) => {
		dispatch({ type: "SET_GROUP", payload: group })
	}

	const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		dispatch({ type: "SET_NOTES", payload: e.target.value })
	}

	const handleSave = async () => {
		if (!state.selectedGroup) return

		dispatch({ type: "SET_PROCESSING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const response = await fetch(
				`/api/registration/update-notes?registrationId=${state.selectedGroup.id}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ notes: state.notes || null }),
				},
			)

			if (response.ok) {
				dispatch({ type: "SET_SUCCESS", payload: true })
			} else {
				const error = await response.text()
				dispatch({ type: "SET_ERROR", payload: error || "Failed to save notes" })
			}
		} catch (err) {
			dispatch({ type: "SET_ERROR", payload: String(err) })
		}
	}

	const handleBack = () => {
		dispatch({ type: "GO_BACK" })
	}

	const handleReset = () => {
		dispatch({ type: "RESET" })
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
		<PageLayout maxWidth="3xl">
			<div className="card bg-base-100 shadow-xs">
				<div className="card-body">
					<h3 className="card-title text-secondary font-semibold mb-4">Registration Notes</h3>

					{/* Step 1: Select Group */}
					{state.step === "group" && (
						<div className="mb-6">
							<h4 className="font-semibold mb-2">Step 1 of 2: Select Group</h4>
							<GroupSearch
								key={state.resetKey}
								clubEvent={state.clubEvent}
								onGroupSelected={handleGroupSelected}
								onError={(err) => dispatch({ type: "SET_ERROR", payload: String(err) })}
							/>
						</div>
					)}

					{/* Step 2: Edit Notes */}
					{state.step === "edit" && !state.success && state.selectedGroup && state.clubEvent && (
						<div>
							<h4 className="font-semibold mb-4">Step 2 of 2: Edit Notes</h4>

							{/* Group Summary */}
							<div className="bg-base-200 p-4 rounded-lg mb-4">
								<div className="text-sm">
									<div className="font-semibold mb-1">
										{state.selectedGroup.course?.name || "Unknown Course"}
									</div>
									<div className="text-xs opacity-70 mb-2">
										{state.clubEvent.canChoose && state.selectedGroup.slots[0]
											? getStart(
													state.clubEvent,
													state.selectedGroup.slots[0],
													state.selectedGroup.course?.holes || [],
												)
											: "Start info not available"}
									</div>
									<div className="text-sm">
										{state.selectedGroup.slots
											?.map((slot) =>
												slot.player ? `${slot.player.firstName} ${slot.player.lastName}` : "Open",
											)
											.join(", ")}
									</div>
								</div>
							</div>

							{/* Notes Textarea */}
							<div className="form-control mb-4">
								<label className="label">
									<span className="label-text">Notes</span>
								</label>
								<textarea
									className="textarea textarea-bordered h-32"
									placeholder="Enter notes for this registration group..."
									value={state.notes}
									onChange={handleNotesChange}
									disabled={state.isProcessing}
								/>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-2 flex-wrap">
								<button
									className="btn btn-primary"
									onClick={() => void handleSave()}
									disabled={state.isProcessing}
								>
									{state.isProcessing && <span className="loading loading-spinner"></span>}
									Save
								</button>
								<button
									className="btn btn-ghost"
									onClick={handleBack}
									disabled={state.isProcessing}
								>
									Back
								</button>
								<button
									className="btn btn-ghost"
									onClick={handleReset}
									disabled={state.isProcessing}
								>
									Start Over
								</button>
							</div>
						</div>
					)}

					{/* Success State */}
					{state.success && (
						<div>
							<div className="alert alert-success mb-4">
								<span>Notes saved successfully!</span>
							</div>
							<div className="flex gap-2 flex-wrap">
								<button className="btn btn-primary" onClick={handleReset}>
									Update More
								</button>
								<a href={`/events/${eventId}/players`} className="btn btn-ghost">
									Player Menu
								</a>
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
		</PageLayout>
	)
}
