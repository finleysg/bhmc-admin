import { currentSeason } from "../../utils/app-config"

export function NoPointsYet() {
	return (
		<div className="card">
			<div className="card-body">
				<h4 className="card-title text-primary">{currentSeason} Standings</h4>
				<p>No points yet for this season.</p>
			</div>
		</div>
	)
}
