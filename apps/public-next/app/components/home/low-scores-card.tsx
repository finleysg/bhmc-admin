import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerLink } from "@/components/player-link"
import { currentSeason } from "@/lib/constants"
import type { LowScore } from "@/lib/types"

interface LowScoresCardProps {
	lowScores: LowScore[]
}

function displayName(ls: LowScore) {
	return ls.is_net ? `${ls.course_name} Net` : `${ls.course_name} Gross`
}

export function LowScoresCard({ lowScores }: LowScoresCardProps) {
	const byCourse = new Map<string, LowScore[]>()
	for (const ls of lowScores) {
		const name = displayName(ls)
		const arr = byCourse.get(name) ?? []
		arr.push(ls)
		byCourse.set(name, arr)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{currentSeason} Low Rounds</CardTitle>
			</CardHeader>
			<CardContent>
				{lowScores.length === 0 ? (
					<p className="text-sm text-muted-foreground">No low rounds recorded for this season.</p>
				) : (
					<div className="space-y-4">
						{[...byCourse.entries()].map(([courseName, scores]) => (
							<div key={courseName}>
								<h6 className="mb-1 text-sm font-semibold text-primary">{courseName}</h6>
								<div className="space-y-0.5">
									{scores.map((ls) => (
										<div key={ls.id} className="flex items-center justify-between text-sm">
											<PlayerLink player={ls.player} />
											<span>{ls.score}</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
