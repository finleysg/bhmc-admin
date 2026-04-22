"use client"

import { useState } from "react"

import { useParams } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { ReportPage } from "@/components/report-page"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { NotesReportRow } from "@repo/domain/types"
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

const NotesTable = ({ data }: { data: NotesReportRow[] | null }) => {
	const [sorting, setSorting] = useState<SortingState>([{ id: "createdDate", desc: true }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

	const columns: ColumnDef<NotesReportRow>[] = [
		{
			accessorKey: "createdDate",
			header: "Signup Date",
			enableSorting: true,
			cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue<string>()}</span>,
		},
		{
			accessorKey: "userName",
			header: "User",
			enableSorting: true,
			cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue<string>()}</span>,
		},
		{
			accessorKey: "notes",
			header: "Notes",
			enableSorting: false,
			cell: ({ getValue }) => <span className="whitespace-pre-wrap">{getValue<string>()}</span>,
		},
	]

	const table = useReactTable({
		data: data || [],
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
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
									<td key={cell.id} className="align-top">
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
	)
}

export default function NotesReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<NotesReportRow[]>
			title="Notes"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/notes`}
			excelPath={`/api/events/${eventId}/reports/notes/excel`}
			filenamePrefix="notes"
		>
			{(data) => <NotesTable data={data} />}
		</ReportPage>
	)
}
