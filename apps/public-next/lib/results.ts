import type {
	ClubEvent,
	EventResultSummary,
	PayoutLineItem,
	TournamentPointsData,
	TournamentResultData,
} from "./types"

export function groupResultsByEvent(
	results: TournamentResultData[] | undefined,
	points: TournamentPointsData[] | undefined,
	clubEvents: ClubEvent[] | undefined,
): EventResultSummary[] {
	if (!results || !clubEvents) return []

	const eventMap = new Map<number, TournamentResultData[]>()
	for (const result of results) {
		const eventId = result.tournament.event
		const existing = eventMap.get(eventId) ?? []
		existing.push(result)
		eventMap.set(eventId, existing)
	}

	const pointsMap = new Map<number, TournamentPointsData[]>()
	if (points) {
		for (const pt of points) {
			const eventId = pt.tournament.event
			const existing = pointsMap.get(eventId) ?? []
			existing.push(pt)
			pointsMap.set(eventId, existing)
		}
	}

	const summaries: EventResultSummary[] = []

	eventMap.forEach((eventResults, eventId) => {
		const clubEvent = clubEvents.find((e) => e.id === eventId)
		if (!clubEvent) return

		const eventPoints = pointsMap.get(eventId) ?? []
		const grossPoints = eventPoints.find((p) => !p.tournament.is_net)
		const netPoints = eventPoints.find((p) => p.tournament.is_net)

		const payouts: PayoutLineItem[] = eventResults
			.filter((r) => parseFloat(r.amount) > 0 && r.payout_type !== null && r.payout_status !== null)
			.map((r) => ({
				label: r.tournament.name,
				amount: parseFloat(r.amount),
				payoutType: r.payout_type!,
				payoutStatus: r.payout_status!,
			}))
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
			eventDate: clubEvent.start_date,
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

	return summaries.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
}
