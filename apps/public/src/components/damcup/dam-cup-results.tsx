import { useQuery } from "@tanstack/react-query"

import { DamCup, DamCupApiSchema, DamCupData } from "../../models/dam-cup"
import { getMany } from "../../utils/api-client"
import { LoadingSpinner } from "../spinners/loading-spinner"

export function DamCupResults() {
	const {
		data: results,
		status,
		fetchStatus,
	} = useQuery({
		queryKey: ["dam-cup-results"],
		queryFn: async () => {
			const data = await getMany<DamCupData>("dam-cup", DamCupApiSchema)
			return data?.map((d) => new DamCup(d)) ?? []
		},
		staleTime: Infinity,
		gcTime: Infinity,
	})

	return (
		<div>
			{status !== "pending" && (
				<table className="table table-striped table-sm">
					<thead>
						<tr>
							<th></th>
							<th className="text-center text-primary">Bunker Hills</th>
							<th className="text-center text-info">Edinburgh</th>
						</tr>
					</thead>
					<tbody>
						{results?.map((r) => {
							return (
								<tr key={r.season}>
									<td>
										<span title={`Played at ${r.site}`}>{r.season}</span>
									</td>
									<td className="text-center">
										{r.ourScore > r.theirScore && (
											<span style={{ fontWeight: "bold" }}>{r.ourScore}</span>
										)}
										{r.ourScore > r.theirScore || <span>{r.ourScore}</span>}
									</td>
									<td className="text-center">
										{r.ourScore < r.theirScore && (
											<span style={{ fontWeight: "bold" }}>{r.theirScore}</span>
										)}
										{r.ourScore < r.theirScore || <span>{r.theirScore}</span>}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
			<LoadingSpinner
				loading={status === "pending" || fetchStatus === "fetching"}
				paddingTop="90px"
			/>
		</div>
	)
}
