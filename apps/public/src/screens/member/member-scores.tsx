import { Link } from "react-router-dom"

import { PlayerScores } from "../../components/scores/player-scores"

export function MemberScoresScreen() {
	return (
		<div className="content__inner">
			<Link to="/member" className="btn btn-link text-secondary ps-0 mb-2">
				Back
			</Link>
			<PlayerScores />
		</div>
	)
}
