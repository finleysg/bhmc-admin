"use client"

import { useReducer, useEffect } from "react"
import { useParams } from "next/navigation"
import type { CompleteClubEvent, CompleteRegistration } from "@repo/domain/types"
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
