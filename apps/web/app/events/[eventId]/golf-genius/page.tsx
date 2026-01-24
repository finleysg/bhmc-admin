"use client"

import { useEffect, useState } from "react"

import { useParams, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { HelperText } from "@/components/ui/helper-text"
import { CompleteClubEvent } from "@repo/domain/types"

import IntegrationOrchestrator from "./components/integration-orchestrator"

export default function GolfGeniusIntegrationPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<CompleteClubEvent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Fetch event data
	useEffect(() => {
		if (!signedIn || !eventId) return

		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (!response.ok) {
					throw new Error(`Failed to fetch event: ${response.status}`)
				}
				const eventData = (await response.json()) as CompleteClubEvent
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
				<LoadingSpinner size="lg" />
			</main>
		)
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	if (error || !event) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Error</h1>
					<HelperText className="mb-4">{error || "Event not found"}</HelperText>
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
