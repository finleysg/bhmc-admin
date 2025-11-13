"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { EventResultsReportDto, EventResultsSectionDto } from "@repo/dto"

import { useSession } from "../../../../../lib/auth-client"

export default function ResultsReportPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [reportData, setReportData] = useState<EventResultsReportDto | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	// Fetch report data
	useEffect(() => {
		if (!signedIn || isPending) return

		const fetchReport = async () => {
			try {
				setLoading(true)
				const url = `/api/events/${eventId}/reports/results`
				const response = await fetch(url)
				if (!response.ok) {
					throw new Error(`Failed to fetch report: ${response.statusText}`)
				}
				const data = (await response.json()) as EventResultsReportDto
				setReportData(data)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error")
			} finally {
				setLoading(false)
			}
		}

		void fetchReport()
	}, [signedIn, isPending, eventId])

	const handleExportToExcel = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/reports/results/excel`)
			if (!response.ok) {
				throw new Error(`Failed to download Excel: ${response.statusText}`)
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `event-results-${eventId}.xlsx`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (error) {
			console.error("Export failed:", error)
			alert("Failed to export Excel file. Please try again.")
		}
	}

	const formatCurrency = (amount: number | undefined) => {
		if (amount === undefined || amount === null) return ""
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount)
	}

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

	if (isPending || loading) {
		return (
			<div className="flex items-center justify-center p-2">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	if (error) {
		return (
			<main className="min-h-screen flex items-center justify-center p-2">
				<div className="w-full max-w-3xl text-center">
					<h2 className="text-3xl font-bold mb-4">Event Results Report</h2>
					<p className="text-error mb-8">Error loading report: {error}</p>
					<Link href={`/events/${eventId}/reports`} className="btn btn-primary">
						Back to Reports
					</Link>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen p-2 md:pl-24 md:pr-24 lg:pl-48 lg:pr-48">
			<div className="w-full">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-xl text-info font-bold">
						Event Results Report - {reportData?.eventName || ""}
					</h1>
					{reportData && reportData.sections.length > 0 && (
						<button onClick={handleExportToExcel} className="btn btn-neutral btn-sm">
							Export to Excel
						</button>
					)}
				</div>

				{!reportData || reportData.sections.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No results data available for this event.</p>
					</div>
				) : (
					<div className="space-y-4">
						{reportData.sections.map((section) => renderSection(section))}
					</div>
				)}
			</div>
		</main>
	)
}
