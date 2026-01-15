import { useLowScores } from "../../hooks/use-low-scores"
import { SeasonProps } from "../../models/common-props"
import { LowScore } from "../../models/low-score"
import { PlayerProfileLink } from "../directory/player-profile-link"
import { OverlaySpinner } from "../spinners/overlay-spinner"

interface LowScoreProps {
	lowScore: LowScore
}

function LowScoreRow({ lowScore }: LowScoreProps) {
	const { player, score } = lowScore

	return (
		<div style={{ display: "flex", justifyContent: "space-between" }}>
			<PlayerProfileLink player={player} />
			<div>{score}</div>
		</div>
	)
}

export function LowScoresCard({ season }: SeasonProps) {
	const { data: lowScores, status, fetchStatus } = useLowScores(season)

	const byCourse =
		lowScores?.reduce((acc, value) => {
			if (!acc.get(value.displayName())) {
				acc.set(value.displayName(), [])
			}
			acc.get(value.displayName())!.push(value)

			return acc
		}, new Map<string, LowScore[]>()) ?? new Map<string, LowScore[]>()

	return (
		<div className="card">
			<div className="card-body">
				<OverlaySpinner loading={status === "pending" || fetchStatus === "fetching"} />
				<h4 className="card-header mb-2">{season} Low Rounds</h4>
				{!lowScores && <p>No low rounds recorded for this season.</p>}
				{[...byCourse.entries()].map((entry) => (
					<div key={entry[0]} style={{ padding: ".5rem" }}>
						<h6 className="text-info">{entry[0]}</h6>
						{entry[1]?.map((ls) => {
							return <LowScoreRow key={ls.id} lowScore={ls} />
						})}
					</div>
				))}
			</div>
		</div>
	)
}
