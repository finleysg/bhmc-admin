"use client"

import { useParams } from "next/navigation"

import { ReportPage } from "@/components/report-page"
import { formatCurrency } from "@/lib/use-report"
import {
	EventResultsReportDto,
	EventResultsSectionDto,
} from "@repo/domain/types"

const renderSection = (section: EventResultsSectionDto) => {
	if (section.type === "proxies") {
		return (
			<div key={section.type} className="mb-8">
				<h3 className="text-lg font-semibold mb-4">{section.header}</h3>
				<div className="overflow-x-auto bg-base-100">
					<table className="table table-zebra table-xs">
						<thead>
							<tr>
								<th className="text-left text-xs">Tournament Name</th>
								<th className="text-left text-xs"></th>
								<th className="text-left text-xs">Player Full Name</th>
								<th className="text-left text-xs"></th>
								<th className="text-left text-xs">Amount</th>
								<th className="text-left text-xs"></th>
							</tr>
						</thead>
						<tbody>
							{section.rows.map((row, index) => (
								<tr key={index}>
									<td>{row.tournamentName || ""}</td>
									<td></td>
									<td>{row.fullName || ""}</td>
									<td></td>
									<td>{formatCurrency(row.amount)}</td>
									<td></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		)
	}

	// Handle stroke and skins sections with sub-sections
	// Check if this is a team event (has team data in stroke results)
	const isTeamEvent =
		section.type === "stroke" &&
		section.subSections.some((subSection) =>
			subSection.rows.some((row) => row.team && row.team.trim() !== ""),
		)

	return (
		<div key={section.type} className="mb-8">
			<h3 className="text-lg font-semibold mb-4">{section.header}</h3>
			{section.subSections.map((subSection, index) => (
				<div
					key={subSection.header}
					className={`mb-6 ${index < section.subSections.length - 1 ? "border-b-2 border-gray-300 pb-4" : ""}`}
					style={index < section.subSections.length - 1 ? { borderBottomWidth: "2.5pt" } : {}}
				>
					<h4 className="text-md font-medium mb-2">{subSection.header}</h4>
					<div className="overflow-x-auto bg-base-100">
						<table className="table table-zebra table-xs">
							<thead>
								<tr>
									{section.type === "stroke" ? (
										<>
											<th className="text-left text-xs">Flight</th>
											<th className="text-left text-xs">Position</th>
											<th className="text-left text-xs">Player Full Name</th>
											<th className="text-left text-xs">Score</th>
											<th className="text-left text-xs">Amount</th>
											{isTeamEvent && <th className="text-left text-xs">Team</th>}
										</>
									) : (
										<>
											<th className="text-left text-xs">Details</th>
											<th className="text-left text-xs">Skins Won</th>
											<th className="text-left text-xs">Player Full Name</th>
											<th className="text-left text-xs"></th>
											<th className="text-left text-xs">Amount</th>
											<th className="text-left text-xs"></th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								{subSection.rows.map((row, index) => (
									<tr key={index}>
										{section.type === "stroke" ? (
											<>
												<td>{row.flight || ""}</td>
												<td>{row.position || ""}</td>
												<td>{row.fullName || ""}</td>
												<td>{row.score || ""}</td>
												<td>{formatCurrency(row.amount)}</td>
												{isTeamEvent && <td>{row.team || ""}</td>}
											</>
										) : (
											<>
												<td>{row.details || ""}</td>
												<td>{row.skinsWon || ""}</td>
												<td>{row.fullName || ""}</td>
												<td></td>
												<td>{formatCurrency(row.amount)}</td>
												<td></td>
											</>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			))}
		</div>
	)
}

export default function ResultsReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<EventResultsReportDto>
			title="Event Results Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/results`}
			excelPath={`/api/events/${eventId}/reports/results/excel`}
			filenamePrefix="event-results"
		>
			{(data) => (
				<div className="space-y-4">{data?.sections.map((section) => renderSection(section))}</div>
			)}
		</ReportPage>
	)
}
