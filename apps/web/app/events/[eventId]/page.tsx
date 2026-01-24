"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import LinkCard from "@/components/link-card"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { ClubEvent } from "@repo/domain/types"

export default function EventHubPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<ClubEvent | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!signedIn || !eventId) return

		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (!response.ok) {
					throw new Error(`Failed to fetch event: ${response.status}`)
				}
				const eventData = (await response.json()) as ClubEvent
				setEvent(eventData)
			} catch (err) {
				console.error("Error fetching event:", err)
			} finally {
				setLoading(false)
			}
		}

		void fetchEvent()
	}, [eventId, signedIn])

	if (isPending || loading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<PageLayout maxWidth="5xl">
			{event && <PageHeader>{event.name}</PageHeader>}
			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				<LinkCard
					title="Player Management"
					description="Manage player change requests (add, move, drop, etc)."
					href={`/events/${eventId}/players`}
					disabled={false}
					icon={"🏌️‍♂️"}
				/>

				<LinkCard
					title="Golf Genius Integration"
					description="Sync and integrate with Golf Genius."
					href={`/events/${eventId}/golf-genius`}
					disabled={false}
					icon={"🧠"}
				/>

				<LinkCard
					title="Event Reporting"
					description="Generate reports for this event."
					href={`/events/${eventId}/reports`}
					disabled={false}
					icon={"📊"}
				/>

				<LinkCard
					title="Event Documents"
					description="Manage documents for this event."
					href={`/events/${eventId}/documents`}
					disabled={false}
					icon={"📄"}
				/>
			</div>
		</PageLayout>
	)
}
