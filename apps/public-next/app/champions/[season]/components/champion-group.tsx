import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MajorChampion, PlayerSummary } from "@/lib/types"
import { ChampionCard } from "./champion-card"

interface ChampionTeam {
	teamKey: string
	flight: string
	isNet: boolean
	score: number
	players: PlayerSummary[]
}

interface ChampionGroupProps {
	eventName: string
	champions: MajorChampion[]
}

export function ChampionGroup({ eventName, champions }: ChampionGroupProps) {
	const teams: ChampionTeam[] = []

	for (const c of champions) {
		const teamKey = c.team_id ?? String(c.player.id)
		const existing = teams.find((t) => t.teamKey === teamKey)
		if (existing) {
			existing.players.push(c.player)
		} else {
			teams.push({
				teamKey,
				flight: c.flight,
				isNet: c.is_net,
				score: c.score,
				players: [c.player],
			})
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-primary">{eventName}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-3">
					{teams.map((team) => (
						<ChampionCard
							key={team.teamKey}
							flight={team.flight}
							isNet={team.isNet}
							score={team.score}
							players={team.players}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
