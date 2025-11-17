"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { ReportPage } from "@/components/report-page"
import { useIsMobile } from "@/lib/use-is-mobile"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { EventReportRowDto } from "@repo/domain/types"
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

const EventTable = ({ data }: { data: EventReportRowDto[] | null }) => {
	const isMobile = useIsMobile()
	const [sorting, setSorting] = useState<SortingState>([{ id: "teamId", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

	// Define columns for TanStack Table
	const columns: ColumnDef<EventReportRowDto>[] = []

	// Fixed columns
	Object.keys(fixedColumnDefs).forEach((key) => {
		columns.push(fixedColumnDefs[key])
	})

	// Dynamic fee columns
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

	// Update column visibility based on mobile state
	useEffect(() => {
		if (!data || data.length === 0) return

		const visibility: Record<string, boolean> = {}

		// Define mobile-visible columns
		const mobileVisibleColumns = ["teamId", "ghin", "tee", "fullName"]

		// Get all column keys (fixed + dynamic)
		const allColumnKeys = Object.keys(fixedColumnDefs)
		const feeKeys = Object.keys(data[0]).filter(
			(key) => !Object.keys(fixedColumnDefs).includes(key) && key !== "signupDate",
		)
		const allKeys = [...allColumnKeys, ...feeKeys]

		// Set visibility based on mobile state
		allKeys.forEach((key) => {
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

export default function EventReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<EventReportRowDto[]>
			title="Event Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/event`}
			excelPath={`/api/events/${eventId}/reports/event/excel`}
			filenamePrefix="event-report"
		>
			{(data) => <EventTable data={data} />}
		</ReportPage>
	)
}
