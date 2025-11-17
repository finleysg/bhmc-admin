"use client"

import { useEffect, useState } from "react"

import { useParams, useRouter } from "next/navigation"

import { EventDto } from "@repo/domain"

import { useSession } from "../../../../lib/auth-client"
import IntegrationOrchestrator from "./components/integration-orchestrator"

export default function GolfGeniusIntegrationPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<EventDto | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	// Fetch event data
	useEffect(() => {
		if (!signedIn || !eventId) return

		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (!response.ok) {
					throw new Error(`Failed to fetch event: ${response.status}`)
				}
				const eventData = (await response.json()) as EventDto
				setEvent(eventData)
			} catch (err) {
				console.error("Error fetching event:", err)
				setError("Event not found")
			} finally {
				setLoading(false)
			}
		}

		void fetchEvent()
	}, [eventId, signedIn])

	if (isPending || loading) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</main>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	if (error || !event) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Error</h1>
					<p className="text-muted-foreground mb-4">{error || "Event not found"}</p>
					<button onClick={() => router.push("/events")} className="btn btn-primary">
						Back to Events
					</button>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen p-0 md:p-8 bg-base-200">
			<div className="max-w-6xl mx-auto">
				<IntegrationOrchestrator selectedEvent={event} />
			</div>
		</main>
	)
}
