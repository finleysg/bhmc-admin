import { MajorChampion } from "../../models/major-champion"
import { ChampionCard, ChampionCardProps } from "./champion-card"

interface ChampionGroupProps {
	season: number
	eventName: string
	champions: MajorChampion[]
}

export function ChampionGroup({ eventName, champions }: ChampionGroupProps) {
	const championsToRender: ChampionCardProps[] = []
	champions.forEach((c) => {
		const index = championsToRender.findIndex((cc) => cc.teamId === c.teamId)
		if (index === -1) {
			championsToRender.push({
				eventName: eventName,
				flight: c.flightDisplay(),
				score: c.score,
				players: [c.player],
				teamId: c.teamId ?? c.player.id.toString(),
			})
		} else {
			championsToRender[index].players.push(c.player)
		}
	})

	return (
		<>
			{championsToRender?.map((c) => (
				<ChampionCard key={c.teamId} {...c} />
			))}
			{/* <ChampionPics season={season} eventName={eventName} /> */}
		</>
	)
}
