import { sortBy, take } from "lodash"

import { useTopPoints } from "../../hooks/use-season-long-points"
import { currentSeason } from "../../utils/app-config"
import { OverlaySpinner } from "../spinners/overlay-spinner"

interface TopPointsProps {
	category: "gross" | "net"
	topN: number
}

export function TopPoints({ category, topN }: TopPointsProps) {
	const { data: points, isLoading } = useTopPoints({ season: currentSeason, category, topN })

	const pointsToRender = () => {
		if (points) {
			return take(
				sortBy(points, [
					function (p) {
						return p.points * -1
					},
				]),
				topN,
			)
		}
		return []
	}

	return (
		<div className="card mt-4 mb-4">
			<div className="card-body">
				<OverlaySpinner loading={isLoading} />
				<div className="card-text">
					<div style={{ overflowY: "auto", overflowX: "auto" }}>
						<table className="table table-striped table-sm">
							<thead>
								<tr>
									<th>Player</th>
									<th>Points</th>
								</tr>
							</thead>
							<tbody>
								{pointsToRender().map((row) => {
									return (
										<tr key={row.id}>
											<td>{row.name}</td>
											<td>{row.points}</td>
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
