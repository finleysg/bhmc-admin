"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { useSession } from "@/lib/auth-client"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { EventReportRowDto } from "@repo/dto"

export default function EventReportPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [reportData, setReportData] = useState<EventReportRowDto[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [currentSort, setCurrentSort] = useState<{
		field: string | null
		dir: "asc" | "desc" | null
	}>({ field: null, dir: null })

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
				const params = new URLSearchParams()
				if (currentSort.field && currentSort.dir) {
					params.append("sort", currentSort.field)
					params.append("dir", currentSort.dir)
				}
				const url = `/api/events/${eventId}/reports/event${params.toString() ? `?${params.toString()}` : ""}`
				const response = await fetch(url)
				if (!response.ok) {
					throw new Error(`Failed to fetch report: ${response.statusText}`)
				}
				const data = (await response.json()) as EventReportRowDto[]
				setReportData(data)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error")
			} finally {
				setLoading(false)
			}
		}

		void fetchReport()
	}, [signedIn, isPending, eventId, currentSort])

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
					<h2 className="text-3xl font-bold mb-4">Event Report</h2>
					<p className="text-error mb-8">Error loading report: {error}</p>
					<Link href={`/events/${eventId}/reports`} className="btn btn-primary">
						Back to Reports
					</Link>
				</div>
			</main>
		)
	}

	// Define fixed columns
	const fixedColumns = [
		"#",
		"teamId",
		"course",
		"start",
		"ghin",
		"age",
		"tee",
		"lastName",
		"firstName",
		"fullName",
		"email",
		"signedUpBy",
	] as const

	// Get dynamic fee columns from first row (excluding signupDate)
	const feeColumns =
		reportData.length > 0
			? Object.keys(reportData[0]).filter(
					(key) =>
						!fixedColumns.includes(key as (typeof fixedColumns)[number]) && key !== "signupDate",
				)
			: []

	const allColumns: string[] = [...fixedColumns, ...feeColumns]

	// Sortable columns mapping
	const sortableColumns = {
		teamId: "team",
		ghin: "ghin",
		age: "age",
		fullName: "fullName",
	}

	// Handle sort click
	const handleSort = (column: string) => {
		const sortField = sortableColumns[column as keyof typeof sortableColumns]
		if (!sortField) return

		setCurrentSort((prev) => {
			if (prev.field === sortField) {
				// Same field - cycle through states
				if (prev.dir === "asc") {
					return { field: sortField, dir: "desc" }
				} else if (prev.dir === "desc") {
					return { field: null, dir: null }
				} else {
					return { field: sortField, dir: "asc" }
				}
			} else {
				// Different field - start with asc
				return { field: sortField, dir: "asc" }
			}
		})
	}

	// Get sort icon for column
	const getSortIcon = (column: string) => {
		const sortField = sortableColumns[column as keyof typeof sortableColumns]
		if (!sortField || currentSort.field !== sortField) {
			return <ArrowsUpDownIcon className="w-4 h-4 ml-1 opacity-50" />
		}

		if (currentSort.dir === "asc") {
			return <ArrowUpIcon className="w-4 h-4 ml-1 text-primary" />
		} else if (currentSort.dir === "desc") {
			return <ArrowDownIcon className="w-4 h-4 ml-1 text-primary" />
		}

		return <ArrowsUpDownIcon className="w-4 h-4 ml-1 opacity-50" />
	}

	return (
		<main className="min-h-screen p-2">
			<div className="w-full">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-3xl font-bold">Event Report</h1>
					<Link href={`/events/${eventId}/reports`} className="btn btn-outline">
						Back to Reports
					</Link>
				</div>

				{reportData.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No report data available for this event.</p>
					</div>
				) : (
					<div className="overflow-x-auto bg-base-100">
						<table className="table table-zebra table-xs">
							<thead>
								<tr>
									{allColumns.map((column) => {
										const isSortable = column in sortableColumns
										const headerText =
											column === "teamId"
												? "Team"
												: column === "ghin"
													? "GHIN"
													: column.charAt(0).toUpperCase() + column.slice(1)

										return (
											<th key={column} className="text-left">
												{isSortable ? (
													<button
														onClick={() => handleSort(column)}
														className="btn btn-ghost btn-xs h-auto p-0 font-normal hover:bg-transparent flex items-center"
													>
														{headerText}
														{getSortIcon(column)}
													</button>
												) : (
													headerText
												)}
											</th>
										)
									})}
								</tr>
							</thead>
							<tbody>
								{reportData.map((row, index) => (
									<tr key={index}>
										{allColumns.map((column) => (
											<td key={column}>
												{column === "#"
													? (index + 1).toString()
													: row[column as keyof EventReportRowDto] || ""}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</main>
	)
}
