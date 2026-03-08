"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { ReportPage } from "@/components/report-page"
import { useIsMobile } from "@/lib/use-is-mobile"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { PointsReportRow } from "@repo/domain/types"
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

const PointsTable = ({ data }: { data: PointsReportRow[] | null }) => {
	const isMobile = useIsMobile()
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "tournamentName", desc: false },
		{ id: "position", desc: false },
	])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

	// Define columns for TanStack Table
	const columns: ColumnDef<PointsReportRow>[] = [
		{
			accessorKey: "tournamentName",
			header: "Tournament Name",
			enableSorting: true,
		},
		{
			accessorKey: "position",
			header: "Position",
			enableSorting: true,
		},
		{
			accessorKey: "fullName",
			header: "Full Name",
			enableSorting: true,
		},
		{
			accessorKey: "ghin",
			header: "GHIN",
			enableSorting: true,
		},
		{
			accessorKey: "handicapIndex",
			header: "HI",
			enableSorting: true,
			cell: ({ getValue }) => {
				const value = getValue()
				return value === null ? "" : value
			},
		},
		{
			accessorKey: "score",
			header: "Score",
			cell: ({ getValue }) => {
				const value = getValue()
				return value === null ? "N/A" : value
			},
		},
		{
			accessorKey: "points",
			header: "Points",
		},
		{
			accessorKey: "type",
			header: "Type",
		},
		{
			accessorKey: "details",
			header: "Details",
			cell: ({ getValue }) => {
				const value = getValue()
				return value === null ? "N/A" : value
			},
		},
	]

	// Update column visibility based on mobile state
	useEffect(() => {
		if (!data || data.length === 0) return

		const visibility: Record<string, boolean> = {}

		// Define mobile-visible columns
		const mobileVisibleColumns = ["tournamentName", "position", "fullName", "points"]

		// Get all column keys
		const allColumnKeys = [
			"tournamentName",
			"position",
			"fullName",
			"ghin",
			"handicapIndex",
			"score",
			"points",
			"type",
			"details",
		]

		// Set visibility based on mobile state
		allColumnKeys.forEach((key) => {
			visibility[key] = !isMobile || mobileVisibleColumns.includes(key)
		})

		setColumnVisibility(visibility)
	}, [isMobile, data])

	// Create table instance
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
			{/* Global Filter */}
			<div className="mb-4 flex gap-2 justify-between">
				<input
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search all fields..."
					className="input input-bordered w-full max-w-xs"
				/>
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
									<td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<Pagination table={table} />
		</>
	)
}

export default function PointsReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<PointsReportRow[]>
			title="Points Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/points`}
			excelPath={`/api/events/${eventId}/reports/points/excel`}
			filenamePrefix="points-report"
		>
			{(data) => <PointsTable data={data} />}
		</ReportPage>
	)
}
