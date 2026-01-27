import { format } from "date-fns"

import type { EventResultSummary } from "../../models/tournament-results"

interface ResultEventCardProps {
	summary: EventResultSummary
}

const formatPointsDetails = (details: string | null): string | null => {
	if (!details) return null
	const colonIndex = details.indexOf(":")
	return colonIndex >= 0 ? details.slice(colonIndex + 1).trim() : details
}

export function ResultEventCard({ summary }: ResultEventCardProps) {
	const renderPayoutBadge = (status: string) => {
		const badgeMap: Record<string, { text: string; className: string }> = {
			paid: { text: "Paid", className: "badge bg-success ms-2" },
			confirmed: { text: "Confirmed", className: "badge bg-info ms-2" },
			pending: { text: "Pending", className: "badge fst-italic text-muted ms-2" },
		}

		const badge = badgeMap[status.toLowerCase()]
		if (!badge) return null

		return <span className={badge.className}>{badge.text}</span>
	}

	const hasScores = summary.grossScore !== null || summary.netScore !== null
	const hasPoints = summary.grossPoints !== null || summary.netPoints !== null
	const hasPayouts = summary.payouts.length > 0

	return (
		<div className="card mb-4">
			<div className="card-body">
				<div className="mb-3">
					<h4 className="card-header mb-1">{summary.eventName}</h4>
					<p className="text-muted mb-0">{format(summary.eventDate, "MMMM d, yyyy")}</p>
				</div>

				{hasScores && (
					<div className="mb-3">
						<h5 className="mb-2">Scores</h5>
						<div className="d-flex flex-column gap-1">
							{summary.grossScore !== null && (
								<div>
									<span className="text-muted">Gross: </span>
									<strong>{summary.grossScore}</strong>
								</div>
							)}
							{summary.netScore !== null && (
								<div>
									<span className="text-muted">Net: </span>
									<strong>{summary.netScore}</strong>
								</div>
							)}
						</div>
					</div>
				)}

				{hasPoints && (
					<div className="mb-3">
						<h5 className="mb-2">Points</h5>
						<div className="d-flex flex-column gap-1">
							{summary.grossPoints !== null && (
								<div>
									<span className="text-muted">Gross: </span>
									<strong>{summary.grossPoints}</strong>
									{summary.grossPointsDetails && (
										<span className="text-muted">
											{" "}
											({formatPointsDetails(summary.grossPointsDetails)})
										</span>
									)}
								</div>
							)}
							{summary.netPoints !== null && (
								<div>
									<span className="text-muted">Net: </span>
									<strong>{summary.netPoints}</strong>
									{summary.netPointsDetails && (
										<span className="text-muted">
											{" "}
											({formatPointsDetails(summary.netPointsDetails)})
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				)}

				{hasPayouts && (
					<div>
						<h5 className="mb-2">Payouts</h5>
						<div className="d-flex flex-column gap-1">
							{summary.payouts.map((payout, index) => (
								<div key={index}>
									<span className="text-muted">{payout.label}: </span>
									<strong>${payout.amount.toFixed(2)}</strong>
									<span className="text-muted ms-1">({payout.payoutType})</span>
									{renderPayoutBadge(payout.payoutStatus)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
