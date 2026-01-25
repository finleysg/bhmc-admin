import { useState, useMemo } from "react"

import { SeasonSelect } from "../../admin/season-select"
import { PendingEventCard } from "../../components/results/pending-event-card"
import { ResultEventCard } from "../../components/results/result-event-card"
import { useTournamentPoints, useTournamentResults } from "../../hooks/use-tournament-results"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { useClubEvents } from "../../hooks/use-club-events"
import { useMyEvents } from "../../hooks/use-my-events"
import { currentSeason } from "../../utils/app-config"
import type { TournamentResult, TournamentPoints } from "../../models/tournament-results"

type CompletedEvent = {
	type: "completed"
	date: Date
	eventName: string
	eventDate: Date
	result: TournamentResult
	points?: TournamentPoints
	hasSkins: boolean
}

type PendingEvent = {
	type: "pending"
	date: Date
	eventName: string
	eventDate: Date
}

type EventItem = CompletedEvent | PendingEvent

export function MemberResultsScreen() {
	const [season, setSeason] = useState(currentSeason)
	const { data: player } = useMyPlayerRecord()
	const { data: results } = useTournamentResults({ playerId: player?.id, season })
	const { data: points } = useTournamentPoints({ playerId: player?.id, season })
	const { data: clubEvents } = useClubEvents(season)
	const { data: futureEventIds } = useMyEvents()

	// Combine completed results and pending events, sorted by date desc
	const allEvents = useMemo(() => {
		const events: EventItem[] = []

		// Add completed results - results now include event_name and event_date
		if (results) {
			results.forEach((result) => {
				const eventPoints = points?.find((p) => p.tournamentId === result.tournamentId)
				events.push({
					type: "completed",
					date: result.eventDate,
					eventName: result.eventName,
					eventDate: result.eventDate,
					result,
					points: eventPoints,
					hasSkins: result.details?.toLowerCase()?.includes("skins") ?? false,
				})
			})
		}

		// Add pending events (future registrations)
		if (futureEventIds && clubEvents) {
			futureEventIds.forEach((eventId) => {
				const event = clubEvents.find((e) => e.id === eventId)
				if (event && event.startDate > new Date()) {
					events.push({
						type: "pending",
						date: event.startDate,
						eventName: event.name,
						eventDate: event.startDate,
					})
				}
			})
		}

		// Sort all events by date descending (newest first)
		return events.sort((a, b) => b.date.getTime() - a.date.getTime())
	}, [results, points, clubEvents, futureEventIds])

	return (
		<div className="content__inner">
			<div className="container py-4">
				<h1 className="mb-4">My Results</h1>

				<SeasonSelect season={season} onSelect={setSeason} />

				{allEvents.length === 0 ? (
					<p className="text-muted mt-4">No results or upcoming events for this season.</p>
				) : (
					<div className="mt-4">
						{allEvents.map((event, index) => {
							if (event.type === "completed") {
								return (
									<ResultEventCard
										key={`result-${event.result.id}-${index}`}
										eventName={event.eventName}
										eventDate={event.eventDate}
										result={event.result}
										points={event.points}
										hasSkins={event.hasSkins}
									/>
								)
							} else {
								return (
									<PendingEventCard
										key={`pending-${event.eventName}-${index}`}
										eventName={event.eventName}
										eventDate={event.eventDate}
									/>
								)
							}
						})}
					</div>
				)}
			</div>
		</div>
	)
}
