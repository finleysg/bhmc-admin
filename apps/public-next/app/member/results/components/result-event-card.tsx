"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EventResultSummary } from "@/lib/types"

interface ResultEventCardProps {
	summary: EventResultSummary
}

function ScoreLine({
	label,
	score,
	position,
}: {
	label: string
	score: number | null
	position: number | null
}) {
	if (score === null && position === null) return null
	return (
		<div className="text-sm">
			<span className="text-muted-foreground">{label}: </span>
			{score !== null && <span className="font-medium">{score}</span>}
			{position !== null && <span className="ml-1 text-muted-foreground">(#{position})</span>}
		</div>
	)
}

function PointsLine({
	label,
	points,
	details,
}: {
	label: string
	points: number | null
	details: string | null
}) {
	if (points === null) return null
	return (
		<div className="text-sm">
			<span className="text-muted-foreground">{label}: </span>
			<span className="font-medium">{points} pts</span>
			{details && <span className="ml-1 text-xs text-muted-foreground">({details})</span>}
		</div>
	)
}

export function ResultEventCard({ summary }: ResultEventCardProps) {
	const formattedDate = new Date(summary.eventDate + "T12:00:00").toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-baseline justify-between">
					<CardTitle className="text-base">{summary.eventName}</CardTitle>
					<span className="text-xs text-muted-foreground">{formattedDate}</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-1">
					<ScoreLine label="Gross" score={summary.grossScore} position={summary.grossPosition} />
					<ScoreLine label="Net" score={summary.netScore} position={summary.netPosition} />
				</div>

				{(summary.grossPoints !== null || summary.netPoints !== null) && (
					<div className="space-y-1 border-t pt-2">
						<PointsLine
							label="Gross Pts"
							points={summary.grossPoints}
							details={summary.grossPointsDetails}
						/>
						<PointsLine
							label="Net Pts"
							points={summary.netPoints}
							details={summary.netPointsDetails}
						/>
					</div>
				)}

				{summary.payouts.length > 0 && (
					<div className="space-y-1 border-t pt-2">
						{summary.payouts.map((payout, i) => {
							const status = payout.payoutStatus.toLowerCase()
							const badgeClass =
								status === "paid"
									? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
									: status === "confirmed"
										? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
										: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
							return (
								<div key={i} className="text-sm">
									<span className="text-muted-foreground">{payout.label}: </span>
									<span className="font-medium">${payout.amount.toFixed(2)}</span>
									<span className="ml-1 text-xs text-muted-foreground">
										({payout.payoutType})
									</span>
									<span
										className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
									>
										{payout.payoutStatus}
									</span>
								</div>
							)
						})}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
