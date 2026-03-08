"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useTournamentResults, useTournamentPoints, useMyEvents } from "@/lib/hooks/use-my-results"
import { useClubEvents } from "@/lib/hooks/use-club-events"
import { groupResultsByEvent } from "@/lib/results"
import type { EventResultSummary } from "@/lib/types"
import { SeasonSelect } from "../scores/components/season-select"
import { ResultEventCard } from "./components/result-event-card"
import { PendingEventCard } from "./components/pending-event-card"

type PendingEvent = {
	type: "pending"
	date: string
	eventName: string
	eventDate: string
}

type CompletedEvent = {
	type: "completed"
	date: string
	summary: EventResultSummary
}

type EventItem = CompletedEvent | PendingEvent

export default function ResultsPage() {
	const currentYear = new Date().getFullYear()
	const [season, setSeason] = useState(currentYear)
	const { data: player } = useMyPlayer()
	const { data: results } = useTournamentResults(player?.id, season)
	const { data: points } = useTournamentPoints(player?.id, season)
	const { data: clubEvents, isLoading } = useClubEvents(season)
	const { data: registrationSlots } = useMyEvents(player?.id, season)

	const futureEventIds = useMemo(() => {
		if (!registrationSlots) return new Set<number>()
		return new Set(registrationSlots.map((s) => s.event))
	}, [registrationSlots])

	const allEvents = useMemo(() => {
		const items: EventItem[] = []

		const summaries = groupResultsByEvent(results, points, clubEvents)
		for (const summary of summaries) {
			items.push({
				type: "completed",
				date: summary.eventDate,
				summary,
			})
		}

		if (clubEvents) {
			for (const eventId of futureEventIds) {
				const event = clubEvents.find((e) => e.id === eventId)
				if (event && new Date(event.start_date) > new Date()) {
					items.push({
						type: "pending",
						date: event.start_date,
						eventName: event.name,
						eventDate: event.start_date,
					})
				}
			}
		}

		return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	}, [results, points, clubEvents, futureEventIds])

	return (
		<div>
			<Link
				href="/member"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back
			</Link>
			<h1 className="mb-6 text-2xl font-semibold text-primary">My Results</h1>

			<div className="mb-4">
				<SeasonSelect season={season} onSelect={setSeason} />
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-40 w-full" />
					))}
				</div>
			) : allEvents.length === 0 ? (
				<p className="mt-4 text-sm text-muted-foreground">
					No results or upcoming events for this season.
				</p>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{allEvents.map((event, index) =>
						event.type === "completed" ? (
							<ResultEventCard
								key={`result-${event.summary.eventId}-${index}`}
								summary={event.summary}
							/>
						) : (
							<PendingEventCard
								key={`pending-${event.eventName}-${index}`}
								eventName={event.eventName}
								eventDate={event.eventDate}
							/>
						),
					)}
				</div>
			)}
		</div>
	)
}
