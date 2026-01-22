"use client"

import { useParams } from "next/navigation"

import ActionCard from "@/components/action-card"
import { useAuth } from "@/lib/auth-context"

export default function EventHubPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

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
			<div className="w-full max-w-5xl">
				<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					<ActionCard
						title="Player Management"
						description="Manage player change requests (add, move, drop, etc)."
						href={`/events/${eventId}/players`}
						disabled={false}
						icon={"🏌️‍♂️"}
					/>

					<ActionCard
						title="Golf Genius Integration"
						description="Sync and integrate with Golf Genius."
						href={`/events/${eventId}/golf-genius`}
						disabled={false}
						icon={"🧠"}
					/>

					<ActionCard
						title="Event Reporting"
						description="Generate reports for this event."
						href={`/events/${eventId}/reports`}
						disabled={false}
						icon={"📊"}
					/>

					<ActionCard
						title="Event Documents"
						description="Manage documents for this event."
						href={`/events/${eventId}/documents`}
						disabled={false}
						icon={"📄"}
					/>
				</div>
			</div>
		</main>
	)
}
