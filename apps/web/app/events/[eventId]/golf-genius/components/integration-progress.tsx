"use client"

import { ProgressEventDto, ProgressTournamentDto } from "@repo/dto"

interface IntegrationProgressProps {
	progress: ProgressEventDto | ProgressTournamentDto
}

export default function IntegrationProgress({ progress }: IntegrationProgressProps) {
	// Check if this is tournament progress or player progress
	const isTournamentProgress = "totalTournaments" in progress && "processedTournaments" in progress
	const isPlayerProgress = "totalPlayers" in progress && "processedPlayers" in progress

	let percentage = 0
	let current = 0
	let total = 0
	let unit = "items"

	if (isTournamentProgress) {
		const tournamentProgress = progress //as ProgressTournamentDto
		current = tournamentProgress.processedTournaments
		total = tournamentProgress.totalTournaments
		unit = "tournaments"
	} else if (isPlayerProgress) {
		const playerProgress = progress //as ProgressEventDto
		current = playerProgress.processedPlayers
		total = playerProgress.totalPlayers
		unit = "players"
	}

	percentage = total > 0 ? Math.round((current / total) * 100) : 0

	return (
		<div className="space-y-2">
			{/* Progress Bar */}
			<progress className="progress progress-primary w-full" value={current} max={total} />

			{/* Progress Status */}
			<div className="flex justify-between text-sm">
				<span>{progress.message || "Processing..."}</span>
				<span className="font-medium">{percentage}%</span>
			</div>

			{/* Count */}
			<p className="text-xs text-base-content/70">
				Processed {current} / {total} {unit}
			</p>
		</div>
	)
}
