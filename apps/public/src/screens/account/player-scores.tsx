import { useParams } from "react-router-dom"

import { PlayerScores } from "../../components/scores/player-scores"
import { Tab } from "../../components/tab/tab"
import { Tabs } from "../../components/tab/tabs"
import { SeasonMenu } from "../../layout/season-menu"
import { currentSeason } from "../../utils/app-config"

export function PlayerScoresScreen() {
	const { scoreType, season } = useParams()
	const year = season === "all" ? 0 : season && !isNaN(+season) ? +season : currentSeason

	let renderedScoreType = scoreType ?? "gross"
	const validScoreTypes = ["gross", "net"]
	if (!scoreType || !validScoreTypes.includes(scoreType)) {
		renderedScoreType = "gross"
	}

	return (
		<div className="content__inner">
			<SeasonMenu
				baseUrl={`/my-scores/${renderedScoreType}`}
				includeAll={true}
				season={year}
				startAt={2021}
			/>
			<div>
				<Tabs>
					<Tab to={`/my-scores/gross/${season ?? currentSeason}`}>Gross Scores</Tab>
					<Tab to={`/my-scores/net/${season ?? currentSeason}`}>Net Scores</Tab>
				</Tabs>
				<PlayerScores isNet={scoreType === "net"} season={year} />
			</div>
		</div>
	)
}
