import { useState, useMemo } from "react"
import { Link } from "react-router-dom"

import { SeasonSelect } from "../../admin/season-select"
import { PendingEventCard } from "../../components/results/pending-event-card"
import { ResultEventCard } from "../../components/results/result-event-card"
import { useTournamentPoints, useTournamentResults } from "../../hooks/use-tournament-results"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { useClubEvents } from "../../hooks/use-club-events"
import { useMyEvents } from "../../hooks/use-my-events"
import { currentSeason } from "../../utils/app-config"
import type { ClubEvent } from "../../models/club-event"
import type {
	TournamentResult,
	TournamentPoints,
	EventResultSummary,
	PayoutLineItem,
} from "../../models/tournament-results"

type PendingEvent = {
	type: "pending"
	date: Date
	eventName: string
	eventDate: Date
}

type CompletedEvent = {
	type: "completed"
	date: Date
	summary: EventResultSummary
}

type EventItem = CompletedEvent | PendingEvent

function groupResultsByEvent(
	results: TournamentResult[] | undefined,
	points: TournamentPoints[] | undefined,
	clubEvents: ClubEvent[] | undefined,
): EventResultSummary[] {
	if (!results || !clubEvents) return []

	// Group results by eventId
	const eventMap = new Map<number, TournamentResult[]>()
	results.forEach((result) => {
		const existing = eventMap.get(result.eventId) || []
		existing.push(result)
		eventMap.set(result.eventId, existing)
	})

	// Group points by eventId
	const pointsMap = new Map<number, TournamentPoints[]>()
	points?.forEach((pt) => {
		const existing = pointsMap.get(pt.eventId) || []
		existing.push(pt)
		pointsMap.set(pt.eventId, existing)
	})

	const summaries: EventResultSummary[] = []

	eventMap.forEach((eventResults, eventId) => {
		const clubEvent = clubEvents.find((e) => e.id === eventId)
		if (!clubEvent) return

		// Find gross and net points
		const eventPoints = pointsMap.get(eventId) || []
		const grossPoints = eventPoints.find((p) => !p.isNet)
		const netPoints = eventPoints.find((p) => p.isNet)

		// Build payouts from results with amount > 0
		const payouts: PayoutLineItem[] = eventResults
			.filter((r) => r.amount > 0 && r.payoutType && r.payoutStatus)
			.map((r) => ({
				label: r.tournamentName,
				amount: r.amount,
				payoutType: r.payoutType!,
				payoutStatus: r.payoutStatus!,
			}))
			// Sort: Credit first, then Cash
			.sort((a, b) => {
				if (a.payoutType.toLowerCase() === "credit" && b.payoutType.toLowerCase() !== "credit")
					return -1
				if (a.payoutType.toLowerCase() !== "credit" && b.payoutType.toLowerCase() === "credit")
					return 1
				return 0
			})

		summaries.push({
			eventId,
			eventName: clubEvent.name,
			eventDate: clubEvent.startDate,
			grossScore: grossPoints?.score ?? null,
			grossPosition: grossPoints?.position ?? null,
			netScore: netPoints?.score ?? null,
			netPosition: netPoints?.position ?? null,
			grossPoints: grossPoints?.points ?? null,
			netPoints: netPoints?.points ?? null,
			grossPointsDetails: grossPoints?.details ?? null,
			netPointsDetails: netPoints?.details ?? null,
			payouts,
		})
	})

	// Sort by date descending
	return summaries.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
}

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

		// Add completed results grouped by event
		const summaries = groupResultsByEvent(results, points, clubEvents)
		summaries.forEach((summary) => {
			events.push({
				type: "completed",
				date: summary.eventDate,
				summary,
			})
		})

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
				<Link to="/member" className="btn btn-link text-secondary ps-0 mb-2">
					Back
				</Link>
				<h2 className="mb-4 text-primary">My Results</h2>

				<SeasonSelect season={season} onSelect={setSeason} />

				{allEvents.length === 0 ? (
					<p className="text-muted mt-4">No results or upcoming events for this season.</p>
				) : (
					<div className="row mt-4">
						{allEvents.map((event, index) => {
							if (event.type === "completed") {
								return (
									<div
										key={`result-${event.summary.eventId}-${index}`}
										className="col-12 col-lg-6 col-xl-4"
									>
										<ResultEventCard summary={event.summary} />
									</div>
								)
							} else {
								return (
									<div
										key={`pending-${event.eventName}-${index}`}
										className="col-12 col-lg-6 col-xl-4"
									>
										<PendingEventCard eventName={event.eventName} eventDate={event.eventDate} />
									</div>
								)
							}
						})}
					</div>
				)}
			</div>
		</div>
	)
}
