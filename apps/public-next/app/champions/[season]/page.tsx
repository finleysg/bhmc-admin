import { SeasonSelector } from "@/components/season-selector"
import { fetchDjango } from "@/lib/fetchers"
import { CHAMPIONS_START_YEAR } from "@/lib/constants"
import type { MajorChampion } from "@/lib/types"
import { ChampionsList } from "./components/champions-list"

interface ChampionsPageProps {
	params: Promise<{ season: string }>
}

export default async function ChampionsPage({ params }: ChampionsPageProps) {
	const { season: seasonParam } = await params
	const season = parseInt(seasonParam, 10)

	const champions = await fetchDjango<MajorChampion[]>(`/champions/?season=${season}`, {
		revalidate: 3600,
	})

	const championsByEvent = new Map<string, MajorChampion[]>()
	for (const c of champions) {
		if (!championsByEvent.has(c.event_name)) {
			championsByEvent.set(c.event_name, [])
		}
		championsByEvent.get(c.event_name)!.push(c)
	}

	const entries = [...championsByEvent.entries()]

	return (
		<div>
			{entries.length === 0 ? (
				<>
					<div className="mb-4">
						<SeasonSelector
							basePath="/champions"
							season={season}
							startYear={CHAMPIONS_START_YEAR}
						/>
					</div>
					<p className="text-muted-foreground">No champions recorded for {season}.</p>
				</>
			) : (
				<ChampionsList
					championsByEvent={entries}
					seasonSelector={
						<SeasonSelector
							basePath="/champions"
							season={season}
							startYear={CHAMPIONS_START_YEAR}
						/>
					}
				/>
			)}
		</div>
	)
}
