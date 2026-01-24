import { TournamentPoints, TournamentResult } from "../../models/tournament-results"
import { format } from "date-fns"

interface ResultEventCardProps {
	eventName: string
	eventDate: Date
	result: TournamentResult
	points?: TournamentPoints
	hasSkins?: boolean
}

export function ResultEventCard({
	eventName,
	eventDate,
	result,
	points,
	hasSkins = false,
}: ResultEventCardProps) {
	const renderPayoutBadge = () => {
		if (!result.payoutStatus) return null

		const badgeMap: Record<string, { text: string; className: string }> = {
			paid: { text: "Paid", className: "badge bg-success" },
			confirmed: { text: "Confirmed", className: "badge bg-info" },
			pending: { text: "Pending", className: "badge bg-warning text-dark" },
		}

		const badge = badgeMap[result.payoutStatus.toLowerCase()]
		if (!badge) return null

		return <span className={badge.className}>{badge.text}</span>
	}

	return (
		<div className="card mb-4">
			<div className="card-body">
				<div className="d-flex justify-content-between align-items-start mb-3">
					<div>
						<h4 className="card-header mb-1">{eventName}</h4>
						<p className="text-muted mb-0">{format(eventDate, "MMMM d, yyyy")}</p>
					</div>
					{renderPayoutBadge()}
				</div>

				{/* Scores Section */}
				<div className="mb-3">
					<h5 className="mb-2">Scores</h5>
					<div className="d-flex gap-4">
						{result.score !== null && (
							<div>
								<span className="text-muted">Gross: </span>
								<strong>{result.score}</strong>
								{result.position > 0 && <span className="text-muted"> (T{result.position})</span>}
							</div>
						)}
						{result.summary && (
							<div>
								<span className="text-muted">Net: </span>
								<strong>{result.summary}</strong>
							</div>
						)}
					</div>
				</div>

				{/* Points Section */}
				{points && (
					<div className="mb-3">
						<h5 className="mb-2">Points</h5>
						<div className="d-flex gap-4">
							<div>
								<span className="text-muted">Points Earned: </span>
								<strong>{points.points}</strong>
							</div>
							{points.position > 0 && (
								<div>
									<span className="text-muted">Position: </span>
									<strong>T{points.position}</strong>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Credits Section - conditional on amount > 0 */}
				{result.amount > 0 && (
					<div className="mb-3">
						<h5 className="mb-2">Credits</h5>
						<div>
							<span className="text-muted">Amount: </span>
							<strong>${result.amount.toFixed(2)}</strong>
							{result.payoutType && <span className="text-muted ms-2">({result.payoutType})</span>}
						</div>
					</div>
				)}

				{/* Skins Section - conditional on skins results */}
				{hasSkins && result.details && (
					<div>
						<h5 className="mb-2">Skins</h5>
						<div className="text-muted">{result.details}</div>
					</div>
				)}
			</div>
		</div>
	)
}
