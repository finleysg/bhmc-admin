"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { useRouter } from "next/navigation"

import { getEventTypeName, parseLocalDate } from "@repo/domain/functions"
import { EventTypeChoices } from "@repo/domain/types"
import { ClubEvent } from "@repo/domain/types"

import { useAuth } from "../../lib/auth-context"
import { LoadingSpinner } from "../components/ui/loading-spinner"

const eventTypeFilter = new Set<string>([
	EventTypeChoices.WEEKNIGHT,
	EventTypeChoices.WEEKEND_MAJOR,
	EventTypeChoices.OPEN,
	EventTypeChoices.OTHER,
])

const eventTypeColor: Record<string, string> = {
	[EventTypeChoices.WEEKNIGHT]: "text-success",
	[EventTypeChoices.WEEKEND_MAJOR]: "text-info",
	[EventTypeChoices.OPEN]: "text-secondary",
	[EventTypeChoices.OTHER]: "text-error",
}

function seasonOptions() {
	const currentYear = new Date().getFullYear()
	const years: number[] = []
	for (let y = currentYear + 1; y >= 2020; y--) {
		years.push(y)
	}
	return years
}

function formatDate(dateString: string) {
	const date = parseLocalDate(dateString)
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})
}

export default function EventsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()

	const [currentSeason, setCurrentSeason] = useState<number>(new Date().getFullYear())
	const [seasonEvents, setSeasonEvents] = useState<ClubEvent[]>([])
	const [isLoadingSeason, setIsLoadingSeason] = useState(false)
	const upcomingRef = useRef<HTMLTableRowElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (signedIn) {
			void fetchSeasonEvents(currentSeason)
		}
	}, [currentSeason, signedIn])

	const fetchSeasonEvents = async (season: number) => {
		setIsLoadingSeason(true)
		try {
			const response = await fetch(`/api/events?season=${season}`)
			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`)
			}
			const events = (await response.json()) as ClubEvent[]
			setSeasonEvents(events)
		} catch (error) {
			console.error("Failed to fetch season events:", error)
			setSeasonEvents([])
		} finally {
			setIsLoadingSeason(false)
		}
	}

	const filteredEvents = useMemo(() => {
		return seasonEvents
			.filter((e) => eventTypeFilter.has(e.eventType))
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
	}, [seasonEvents])

	const upcomingIndex = useMemo(() => {
		const today = new Date().toISOString().split("T")[0]
		return filteredEvents.findIndex((e) => e.startDate >= today)
	}, [filteredEvents])

	useEffect(() => {
		if (
			!isLoadingSeason &&
			filteredEvents.length > 0 &&
			upcomingRef.current &&
			scrollContainerRef.current
		) {
			scrollContainerRef.current.scrollTop =
				upcomingRef.current.offsetTop - scrollContainerRef.current.offsetTop
		}
	}, [isLoadingSeason, filteredEvents])

	if (isPending) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<LoadingSpinner size="lg" />
			</main>
		)
	}

	if (!signedIn && !isPending) {
		return null
	}

	return (
		<main className="min-h-screen p-0 md:p-8 bg-base-200">
			<div className="max-w-3xl mx-auto">
				<h2 className="text-xl text-primary mb-3">Select an Event</h2>
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body">
						<div className="flex items-center justify-between mb-4">
							<h2 className="card-title">Events</h2>
							<select
								className="select select-bordered select-sm w-auto"
								value={currentSeason}
								onChange={(e) => setCurrentSeason(Number(e.target.value))}
							>
								{seasonOptions().map((y) => (
									<option key={y} value={y}>
										{y}
									</option>
								))}
							</select>
						</div>

						{isLoadingSeason ? (
							<div className="flex items-center gap-3 py-8 justify-center">
								<span className="loading loading-spinner loading-md"></span>
								<p className="font-medium">Loading events...</p>
							</div>
						) : filteredEvents.length === 0 ? (
							<p className="text-center py-8 text-base-content/60">No events found</p>
						) : (
							<div ref={scrollContainerRef} className="overflow-y-auto max-h-[70vh]">
								<table className="table table-sm">
									<thead>
										<tr>
											<th>Date</th>
											<th>Event</th>
											<th>Type</th>
										</tr>
									</thead>
									<tbody>
										{filteredEvents.map((event, idx) => (
											<tr
												key={event.id}
												ref={idx === upcomingIndex ? upcomingRef : undefined}
												className="hover cursor-pointer"
												onClick={() => router.push(`/events/${event.id}`)}
											>
												<td className="whitespace-nowrap">{formatDate(event.startDate)}</td>
												<td>{event.name}</td>
												<td
													className={`whitespace-nowrap font-medium ${eventTypeColor[event.eventType] ?? ""}`}
												>
													{getEventTypeName(event.eventType)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
