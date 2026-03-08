"use client"

import { useEffect, useState } from "react"

import { useParams, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { parseLocalDate } from "@repo/domain/functions"
import { ClubEvent } from "@repo/domain/types"

export default function EventLayout({ children }: { children: React.ReactNode }) {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<ClubEvent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

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
				setError("Event not found")
			} finally {
				setLoading(false)
			}
		}

		void fetchEvent()
	}, [eventId, signedIn])

	if (!signedIn && !isPending) {
		return null
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center md:p-8">
				<LoadingSpinner size="lg" />
			</div>
		)
	}

	if (error || !event) {
		return (
			<div className="text-center md:p-8">
				<h1 className="text-2xl font-bold mb-4">Error</h1>
				<p className="text-muted-foreground mb-4">{error || "Event not found"}</p>
				<button onClick={() => router.push("/events")} className="btn btn-primary">
					Back to Events
				</button>
			</div>
		)
	}

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return "Unknown date"
		const date = parseLocalDate(dateString)
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})
	}

	const headerText = `${formatDate(event.startDate)}: ${event.name}`

	return (
		<div>
			<div className="flex justify-center md:px-8 pt-4 md:pt-8">
				<div className="w-full max-w-3xl px-4 md:px-0">
					<h2 className="text-xl font-bold text-primary text-center mb-4">{headerText}</h2>
				</div>
			</div>
			{children}
		</div>
	)
}
