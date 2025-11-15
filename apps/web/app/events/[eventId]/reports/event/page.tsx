"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { useSession } from "@/lib/auth-client"
import { useIsMobile } from "@/lib/use-is-mobile"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { EventReportRowDto } from "@repo/dto"
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
} from "@tanstack/react-table"

// Fixed columns definition (moved outside component to prevent re-creation)
const fixedColumnDefs: Record<string, ColumnDef<EventReportRowDto>> = {
	teamId: {
		accessorKey: "teamId",
		header: "Team",
		enableSorting: true,
	},
	course: {
		accessorKey: "course",
		header: "Course",
	},
	start: {
		accessorKey: "start",
		header: "Start",
	},
	ghin: {
		accessorKey: "ghin",
		header: "GHIN",
		enableSorting: true,
	},
	age: {
		accessorKey: "age",
		header: "Age",
		enableSorting: true,
		sortingFn: (rowA, rowB) => {
			const a = rowA.getValue("age")
			const b = rowB.getValue("age")
			const aNum = a === "n/a" ? 999 : parseInt(a as string)
			const bNum = b === "n/a" ? 999 : parseInt(b as string)
			return aNum - bNum
		},
	},
	tee: {
		accessorKey: "tee",
		header: "Tee",
	},
	lastName: {
		accessorKey: "lastName",
		header: "Last Name",
	},
	firstName: {
		accessorKey: "firstName",
		header: "First Name",
	},
	fullName: {
		accessorKey: "fullName",
		header: "Full Name",
		enableSorting: true,
	},
	email: {
		accessorKey: "email",
		header: "Email",
	},
	signedUpBy: {
		accessorKey: "signedUpBy",
		header: "Signed Up By",
	},
}

export default function EventReportPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string
	const isMobile = useIsMobile()

	const [reportData, setReportData] = useState<EventReportRowDto[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [sorting, setSorting] = useState<SortingState>([{ id: "teamId", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

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
				const url = `/api/events/${eventId}/reports/event`
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
	}, [signedIn, isPending, eventId])

	// Define columns for TanStack Table
	const columns: ColumnDef<EventReportRowDto>[] = []

	// Fixed columns
	Object.keys(fixedColumnDefs).forEach((key) => {
		columns.push(fixedColumnDefs[key])
	})

	// Dynamic fee columns
	if (reportData.length > 0) {
		const feeKeys = Object.keys(reportData[0]).filter(
			(key) => !Object.keys(fixedColumnDefs).includes(key) && key !== "signupDate",
		)
		feeKeys.forEach((key) => {
			columns.push({
				accessorKey: key,
				header: key.replace(/([A-Z])/g, " $1").trim(),
			})
		})
	}

	// Update column visibility based on mobile state
	useEffect(() => {
		if (reportData.length === 0) return

		const visibility: Record<string, boolean> = {}

		// Define mobile-visible columns
		const mobileVisibleColumns = ["teamId", "ghin", "tee", "fullName"]

		// Get all column keys (fixed + dynamic)
		const allColumnKeys = Object.keys(fixedColumnDefs)
		const feeKeys = Object.keys(reportData[0]).filter(
			(key) => !Object.keys(fixedColumnDefs).includes(key) && key !== "signupDate",
		)
		const allKeys = [...allColumnKeys, ...feeKeys]

		// Set visibility based on mobile state
		allKeys.forEach((key) => {
			visibility[key] = !isMobile || mobileVisibleColumns.includes(key)
		})

		setColumnVisibility(visibility)
	}, [isMobile, reportData, fixedColumnDefs])

	const handleExportToExcel = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/reports/event/excel`)
			if (!response.ok) {
				throw new Error(`Failed to download Excel: ${response.statusText}`)
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `event-report-${eventId}.xlsx`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (error) {
			console.error("Export failed:", error)
			alert("Failed to export Excel file. Please try again.")
		}
	}

	// Create table instance
	const table = useReactTable({
		data: reportData,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
			columnVisibility,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	})

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

	return (
		<main className="min-h-screen p-2">
			<div className="w-full">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-xl text-info font-bold">
						Event Report ({reportData.length} {reportData.length === 1 ? "record" : "records"})
					</h1>
				</div>

				{reportData.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No report data available for this event.</p>
					</div>
				) : (
					<>
						{/* Global Filter */}
						<div className="mb-4 flex gap-2 justify-between">
							<input
								value={globalFilter ?? ""}
								onChange={(e) => setGlobalFilter(e.target.value)}
								placeholder="Search all fields..."
								className="input input-bordered w-full max-w-xs"
							/>
							<button
								onClick={() => void handleExportToExcel()}
								className="btn btn-neutral btn-sm"
								disabled={reportData.length === 0}
							>
								Export to Excel
							</button>
						</div>

						{/* Table */}
						<div className="overflow-x-auto bg-base-100">
							<table className="table table-zebra table-xs">
								<thead>
									{table.getHeaderGroups().map((headerGroup) => (
										<tr key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<th key={header.id} className="text-left text-xs">
													{header.isPlaceholder ? null : (
														<div
															className={
																header.column.getCanSort()
																	? "cursor-pointer select-none flex items-center"
																	: ""
															}
															onClick={header.column.getToggleSortingHandler()}
														>
															{flexRender(header.column.columnDef.header, header.getContext())}
															{{
																asc: <ArrowUpIcon className="w-4 h-4 ml-1 text-primary" />,
																desc: <ArrowDownIcon className="w-4 h-4 ml-1 text-primary" />,
															}[header.column.getIsSorted() as string] ??
																(header.column.getCanSort() ? (
																	<ArrowsUpDownIcon className="w-4 h-4 ml-1 opacity-50" />
																) : null)}
														</div>
													)}
												</th>
											))}
										</tr>
									))}
								</thead>
								<tbody>
									{table.getRowModel().rows.map((row) => (
										<tr key={row.id}>
											{row.getVisibleCells().map((cell) => (
												<td key={cell.id}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<Pagination table={table} />
					</>
				)}
			</div>
		</main>
	)
}
