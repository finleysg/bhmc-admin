/* eslint-disable @typescript-eslint/no-explicit-any */
import { OverlaySpinner } from "../spinners/overlay-spinner"

interface RenderDetailDataProps {
	title: string
	reportHeader: string[]
	reportData: any[][]
	loading: boolean
}

export function RenderDetailData({
	loading,
	reportHeader,
	reportData,
	title,
}: RenderDetailDataProps) {
	return (
		<div className="ms-5 me-5 flex-grow-1">
			<OverlaySpinner loading={loading} />
			<h5 className="card-title text-primary">{title}</h5>
			<div style={{ overflowY: "auto" }}>
				<table className="table table-striped table-sm">
					<thead>
						<tr>
							{reportHeader.map((h) => (
								<th key={h?.replace(" ", "-").toLowerCase()}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{reportData.map((row, rx) => {
							return (
								<tr key={`${row[0]}-${rx}`}>
									{row.map((cell, cx) => {
										return (
											<td key={`${cell}-${cx}`} className="report-cell ps-2 pe-2">
												{cell}
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}
