"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import ActionCard from "@/components/action-card"
import { useAuth } from "@/lib/auth-context"
import { ClubEvent } from "@repo/domain/types"

export default function EventManagementPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string
	const [event, setEvent] = useState<ClubEvent | null>(null)

	// Fetch event data
	useEffect(() => {
		if (signedIn && eventId) {
			fetch(`/api/events/${eventId}`)
				.then((res) => res.json())
				.then((data: ClubEvent) => {
					setEvent(data)
				})
				.catch(() => {})
		}
	}, [signedIn, eventId])

	if (isPending) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-3xl">
				<h2 className="text-3xl font-bold mb-4 text-center">Manage Players</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					<ActionCard title="Add" description="Add a player to this event" href="players/add" />
					{event?.canChoose && (
						<ActionCard
							title="Move"
							description="Move a player or group to another spot in the teesheet"
							href="players/move"
						/>
					)}
					<ActionCard
						title="Drop"
						description="Remove a player or group from the event"
						href="players/drop"
					/>
					<ActionCard
						title="Replace"
						description="Replace a player with another player"
						href="players/replace"
					/>
					<ActionCard
						title="Swap"
						description="Swap a player or group with another player or group"
						href="players/swap"
					/>
					<ActionCard
						title="Notes"
						description="Add or update registration notes"
						href="players/notes"
					/>
				</div>
			</div>
		</main>
	)
}
