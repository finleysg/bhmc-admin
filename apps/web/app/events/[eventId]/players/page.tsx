"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import LinkCard from "@/components/link-card"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
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
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<PageLayout maxWidth="3xl">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				<LinkCard title="Add" description="Add a player to this event" href="players/add" />
				{event?.canChoose && (
					<LinkCard
						title="Move"
						description="Move a player or group to another spot in the teesheet"
						href="players/move"
					/>
				)}
				<LinkCard
					title="Drop"
					description="Remove a player or group from the event"
					href="players/drop"
				/>
				<LinkCard
					title="Replace"
					description="Replace a player with another player"
					href="players/replace"
				/>
				<LinkCard
					title="Swap"
					description="Swap a player or group with another player or group"
					href="players/swap"
				/>
				<LinkCard
					title="Notes"
					description="Add or update registration notes"
					href="players/notes"
				/>
			</div>
		</PageLayout>
	)
}
