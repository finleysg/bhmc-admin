import { useState } from "react"
import { useParams } from "react-router-dom"

import { PlayerScores } from "../../components/scores/player-scores"
import { ExportScoresButton } from "../../components/scores/export-scores-button"
import { Tab } from "../../components/tab/tab"
import { Tabs } from "../../components/tab/tabs"
import { SeasonMenu } from "../../layout/season-menu"
import { currentSeason } from "../../utils/app-config"
import { Round } from "../../models/scores"

export function MemberScoresScreen() {
	const { scoreType, season } = useParams()
	const year = season === "all" ? 0 : season && !isNaN(+season) ? +season : currentSeason

	let renderedScoreType = scoreType ?? "gross"
	const validScoreTypes = ["gross", "net"]
	if (!scoreType || !validScoreTypes.includes(scoreType)) {
		renderedScoreType = "gross"
	}

	const [filteredRounds, setFilteredRounds] = useState<Round[]>([])

	return (
		<div className="content__inner">
			<SeasonMenu
				baseUrl={`/member/scores/${renderedScoreType}`}
				includeAll={true}
				season={year}
				startAt={2021}
			/>
			<div>
				<Tabs>
					<Tab to={`/member/scores/gross/${season ?? currentSeason}`}>Gross Scores</Tab>
					<Tab to={`/member/scores/net/${season ?? currentSeason}`}>Net Scores</Tab>
				</Tabs>
				<div className="d-flex justify-content-end mb-2">
					<ExportScoresButton rounds={filteredRounds} season={year} disabled={filteredRounds.length === 0} />
				</div>
				<PlayerScores
					isNet={scoreType === "net"}
					season={year}
					onFilteredRoundsChange={setFilteredRounds}
				/>
			</div>
		</div>
	)
}
