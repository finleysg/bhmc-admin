import { Trophy } from "lucide-react"
import { PlayerLink } from "@/components/player-link"
import type { PlayerSummary } from "@/lib/types"

interface ChampionCardProps {
	flight: string
	isNet: boolean
	score: number
	players: PlayerSummary[]
}

export function ChampionCard({ flight, isNet, score, players }: ChampionCardProps) {
	const flightDisplay = isNet ? `${flight} (net)` : `${flight} (gross)`

	return (
		<div className="rounded-lg border-l-[6px] border-amber-500 bg-muted px-4 py-3">
			<div className="mb-1 text-sm font-medium">
				{players.map((player, i) => (
					<span key={player.id}>
						{i > 0 && ", "}
						<PlayerLink player={player} />
					</span>
				))}
			</div>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Trophy className="size-3 shrink-0 text-amber-500" />
				<span>{flightDisplay}</span>
				<span>— {score}</span>
			</div>
		</div>
	)
}
