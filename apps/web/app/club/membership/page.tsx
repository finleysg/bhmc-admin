"use client"

import { useEffect, useState } from "react"

import Link from "next/link"

import { Pagination } from "@/components/pagination"
import { useIsMobile } from "@/lib/use-is-mobile"
import { useAuthenticatedFetch, useExcelExport } from "@/lib/use-report"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { EventReportRow } from "@repo/domain/types"
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

// Fixed columns definition
const fixedColumnDefs: Record<string, ColumnDef<EventReportRow>> = {
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

const MembershipTable = ({ data }: { data: EventReportRow[] | null }) => {
	const isMobile = useIsMobile()
	const [sorting, setSorting] = useState<SortingState>([{ id: "fullName", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

	const columns: ColumnDef<EventReportRow>[] = []

	Object.keys(fixedColumnDefs).forEach((key) => {
		columns.push(fixedColumnDefs[key])
	})

	if (data && data.length > 0) {
		const feeKeys = Object.keys(data[0]).filter(
			(key) => !Object.keys(fixedColumnDefs).includes(key) && key !== "signupDate",
		)
		feeKeys.forEach((key) => {
			columns.push({
				accessorKey: key,
				header: key.replace(/([A-Z])/g, " $1").trim(),
			})
		})
	}

	useEffect(() => {
		if (!data || data.length === 0) return

		const visibility: Record<string, boolean> = {}
		const screenHiddenColumns = ["teamId", "fullName", "course", "start"]
		const mobileVisibleColumns = ["ghin", "tee", "firstName", "lastName"]

		const allColumnKeys = Object.keys(fixedColumnDefs)
		const feeKeys = Object.keys(data[0]).filter(
			(key) => !Object.keys(fixedColumnDefs).includes(key) && key !== "signupDate",
		)
		const allKeys = [...allColumnKeys, ...feeKeys]

		allKeys.forEach((key) => {
			if (screenHiddenColumns.includes(key)) {
				visibility[key] = false
			} else {
				visibility[key] = !isMobile || mobileVisibleColumns.includes(key)
			}
		})

		setColumnVisibility(visibility)
	}, [isMobile, data])

	const table = useReactTable({
		data: data || [],
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

	return (
		<>
			<div className="mb-4 flex gap-2 justify-between">
				<input
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search all fields..."
					className="input input-bordered w-full max-w-xs"
				/>
			</div>

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
									<td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Pagination table={table} />
		</>
	)
}

export default function MembershipReportPage() {
	const currentSeason = new Date().getFullYear()
	const [eventId, setEventId] = useState<number | null>(null)
	const [eventError, setEventError] = useState<string | null>(null)

	// First fetch the season registration event ID
	useEffect(() => {
		async function fetchSeasonEvent() {
			try {
				const response = await fetch(`/api/events/season-registration/${currentSeason}`)
				if (!response.ok) {
					const errorData = (await response.json()) as { message?: string }
					throw new Error(errorData.message || "Failed to find season registration event")
				}
				const data = (await response.json()) as { eventId: number }
				setEventId(data.eventId)
			} catch (err) {
				setEventError(err instanceof Error ? err.message : "Unknown error")
			}
		}
		void fetchSeasonEvent()
	}, [currentSeason])

	// Then fetch the event report data
	const fetchPath = eventId ? `/api/events/${eventId}/reports/event` : null
	const excelPath = eventId ? `/api/events/${eventId}/reports/event/excel` : ""
	const { data, loading, error } = useAuthenticatedFetch<EventReportRow[]>(fetchPath)
	const { download } = useExcelExport(excelPath, `membership-report-${currentSeason}`)

	if (eventError) {
		return (
			<main className="min-h-screen flex items-center justify-center p-2">
				<div className="w-full max-w-3xl text-center">
					<h2 className="text-3xl font-bold mb-4">Membership Report</h2>
					<p className="text-error mb-8">{eventError}</p>
					<Link href="/club" className="btn btn-primary">
						Back to Club Administration
					</Link>
				</div>
			</main>
		)
	}

	if (!eventId || loading) {
		return (
			<div className="flex items-center justify-center p-2">
				<LoadingSpinner size="lg" />
			</div>
		)
	}

	if (error) {
		return (
			<main className="min-h-screen flex items-center justify-center p-2">
				<div className="w-full max-w-3xl text-center">
					<h2 className="text-3xl font-bold mb-4">Membership Report</h2>
					<p className="text-error mb-8">Error loading report: {error}</p>
					<Link href="/club" className="btn btn-primary">
						Back to Club Administration
					</Link>
				</div>
			</main>
		)
	}

	const recordCount = data ? data.length : 0
	const hasData = recordCount > 0

	return (
		<main className="min-h-screen p-2">
			<div className="w-full">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-xl text-info font-bold">
						{currentSeason} Membership Report
						<span>
							{" "}
							({recordCount} {recordCount === 1 ? "member" : "members"})
						</span>
					</h1>
					{hasData && (
						<button onClick={() => void download()} className="btn btn-neutral btn-sm">
							Export to Excel
						</button>
					)}
				</div>

				{hasData ? (
					<MembershipTable data={data} />
				) : (
					<EmptyState message="No membership data available." />
				)}
			</div>
		</main>
	)
}
