import { SeasonSelector } from "@/components/season-selector"
import { fetchDjango } from "@/lib/fetchers"
import { CHAMPIONS_START_YEAR } from "@/lib/constants"
import type { MajorChampion } from "@/lib/types"
import { ChampionsList } from "./components/champions-list"

export interface ChampionEventGroup {
	eventKey: string
	eventName: string
	eventStartDate: string | null
	champions: MajorChampion[]
}

interface ChampionsPageProps {
	params: Promise<{ season: string }>
}

export default async function ChampionsPage({ params }: ChampionsPageProps) {
	const { season: seasonParam } = await params
	const season = parseInt(seasonParam, 10)

	const champions = await fetchDjango<MajorChampion[]>(`/champions/?season=${season}`, {
		revalidate: 3600,
	})

	const groupMap = new Map<string, ChampionEventGroup>()
	for (const c of champions) {
		const key = c.event != null ? String(c.event) : c.event_name
		const existing = groupMap.get(key)
		if (existing) {
			existing.champions.push(c)
		} else {
			groupMap.set(key, {
				eventKey: key,
				eventName: c.event_display_name ?? c.event_name,
				eventStartDate: c.event_start_date,
				champions: [c],
			})
		}
	}
	const groups = [...groupMap.values()]

	return (
		<div>
			{groups.length === 0 ? (
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
					groups={groups}
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
