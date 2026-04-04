"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { ReportPage } from "@/components/report-page"
import { formatCurrency } from "@/lib/use-report"
import { useIsMobile } from "@/lib/use-is-mobile"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { SkinsReportRow } from "@repo/domain/types"
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

const SkinsTable = ({ data }: { data: SkinsReportRow[] | null }) => {
	const isMobile = useIsMobile()
	const [sorting, setSorting] = useState<SortingState>([{ id: "playerName", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

	const columns: ColumnDef<SkinsReportRow>[] = [
		{
			accessorKey: "playerName",
			header: "Player Name",
			enableSorting: true,
		},
		{
			accessorKey: "skinsSummary",
			header: "Skins Summary",
			enableSorting: true,
		},
		{
			accessorKey: "totalAmount",
			header: "Total Amount",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
	]

	useEffect(() => {
		if (!data || data.length === 0) return

		const visibility: Record<string, boolean> = {}
		const mobileVisibleColumns = ["playerName", "totalAmount"]
		const allColumnKeys = ["playerName", "skinsSummary", "totalAmount"]

		allColumnKeys.forEach((key) => {
			visibility[key] = !isMobile || mobileVisibleColumns.includes(key)
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

export default function SkinsReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<SkinsReportRow[]>
			title="Skins Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/skins`}
			excelPath={`/api/events/${eventId}/reports/skins/excel`}
			filenamePrefix="skins-report"
		>
			{(data) => <SkinsTable data={data} />}
		</ReportPage>
	)
}
