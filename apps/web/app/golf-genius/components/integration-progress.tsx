"use client"

import { ProgressEventDto } from "@repo/dto"

interface IntegrationProgressProps {
	progress: ProgressEventDto
}

export default function IntegrationProgress({ progress }: IntegrationProgressProps) {
	const percentage = Math.round((progress.processedPlayers / progress.totalPlayers) * 100)

	return (
		<div className="space-y-2">
			{/* Progress Bar */}
			<progress
				className="progress progress-primary w-full"
				value={progress.processedPlayers}
				max={progress.totalPlayers}
			/>

			{/* Progress Status */}
			<div className="flex justify-between text-sm">
				<span>{progress.message || "Processing..."}</span>
				<span className="font-medium">{percentage}%</span>
			</div>

			{/* Player Count */}
			<p className="text-xs text-base-content/70">
				Processed {progress.processedPlayers} / {progress.totalPlayers} players
			</p>
		</div>
	)
}
