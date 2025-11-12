"use client"

import { useEffect } from "react"

import { useParams, useRouter } from "next/navigation"

import { useSession } from "../../../lib/auth-client"
import ActionCard from "../../components/action-card"

export default function EventHubPage() {
	const { data: session } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn) {
			router.push("/sign-in")
		}
	}, [signedIn, router])

	if (!signedIn) {
		return null // Redirecting
	}

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-5xl">
				<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					<ActionCard
						title="Event Management"
						description="Manage event details, players, and schedules."
						href={`/events/${eventId}/management`}
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
						href={`/events/${eventId}/reporting`}
						disabled={false}
						icon={"📊"}
					/>
				</div>
			</div>
		</main>
	)
}
