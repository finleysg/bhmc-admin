import { Points } from "../../models/points"

export function EventPointsList({ points }: { points: Points[] }) {
	return (
		<div style={{ overflowY: "auto", overflowX: "auto" }}>
			<table className="table table-striped table-sm">
				<thead>
					<tr>
						<th>Player</th>
						<th>Category</th>
						<th>Gross Points</th>
						<th>Net Points</th>
					</tr>
				</thead>
				<tbody>
					{points.map((row) => {
						return (
							<tr key={row.id}>
								<td>{row.name}</td>
								<td>{row.category}</td>
								<td>{row.grossPoints}</td>
								<td>{row.netPoints}</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
