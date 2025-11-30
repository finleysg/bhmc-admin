"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { GroupSearch } from "../components/group-search"
import type { ValidatedClubEvent, ValidatedRegistration } from "@repo/domain/types"

export default function DropPlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const [clubEvent, setClubEvent] = useState<ValidatedClubEvent | null>(null)
	const [, setSelectedGroup] = useState<ValidatedRegistration | undefined>(undefined)
	const [error, setError] = useState<unknown>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as ValidatedClubEvent
					setClubEvent(eventData)
				} else {
					setError("Failed to fetch event")
				}
			} catch (err) {
				setError(err)
			} finally {
				setIsLoading(false)
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!clubEvent) {
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
								clubEvent={clubEvent}
								onGroupSelected={setSelectedGroup}
								onError={setError}
							/>
						</div>

						{error && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2 text-error">Unhandled Error</h4>
								<div className="alert alert-error text-xs mb-2">
									<span className="text-wrap">Error: {JSON.stringify(error)}</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
