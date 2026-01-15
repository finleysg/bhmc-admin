import { useParams } from "react-router-dom"

import { ChampionGroup } from "../components/results/champion-group"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { useChampions } from "../hooks/use-major-champions"
import { SeasonMenu } from "../layout/season-menu"
import { MajorChampion } from "../models/major-champion"
import { currentSeason } from "../utils/app-config"

export function ChampionsScreen() {
	const { season } = useParams()
	const year = season ? +season : currentSeason
	const { data: champions, status } = useChampions(year)

	// TODO: move to utility file - also used in champion list component
	// or simplify that champion list component since we don't need multiple groupings there
	const championsByEvent =
		champions?.reduce((acc, value) => {
			if (!acc.has(value.eventName)) {
				acc.set(value.eventName, [])
			}
			acc.get(value.eventName)!.push(value)
			return acc
		}, new Map<string, MajorChampion[]>()) ?? new Map<string, MajorChampion[]>()

	return (
		<div className="content__inner">
			<SeasonMenu baseUrl={`/champions`} includeAll={false} season={year} startAt={2017} />
			<div className="card">
				<OverlaySpinner loading={status === "pending"} />
				<div className="card-body">
					<h3 className="card-header">{year} Major Champions</h3>
					{[...championsByEvent.entries()].map((entry) => (
						<>
							<ChampionGroup
								key={entry[0]}
								season={year}
								eventName={entry[0]}
								champions={entry[1]}
							/>
							<hr />
						</>
					))}
				</div>
			</div>
		</div>
	)
}
