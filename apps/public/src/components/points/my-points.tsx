import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { usePlayerPoints } from "../../hooks/use-season-long-points"
import { currentSeason } from "../../utils/app-config"
import { isoDayFormat } from "../../utils/date-utils"
import { OverlaySpinner } from "../spinners/overlay-spinner"

export function MyPoints() {
	const { data: player } = useMyPlayerRecord()
	const { data: points, isLoading } = usePlayerPoints({
		season: currentSeason,
		playerId: player?.id,
	})

	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header mb-2">My {currentSeason} Points</h4>
				<div className="card-text">
					<OverlaySpinner loading={isLoading} />
					<div style={{ overflowY: "auto", overflowX: "auto" }}>
						<table className="table table-striped table-sm">
							<thead>
								<tr>
									<th>Date</th>
									<th>Event</th>
									<th>Gross</th>
									<th>Net</th>
								</tr>
							</thead>
							<tbody>
								{points?.map((row) => {
									return (
										<tr key={row.id}>
											<td>{isoDayFormat(row.event.startDate)}</td>
											<td>{row.event.name}</td>
											<td>{row.grossPoints}</td>
											<td>{row.netPoints}</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
