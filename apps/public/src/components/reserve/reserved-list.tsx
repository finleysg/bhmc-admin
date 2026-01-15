import { useCallback, useEffect, useMemo, useState } from "react"
import { useMediaQuery } from "usehooks-ts"
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"

import { useAuth } from "../../hooks/use-auth"
import { useEventRegistrations } from "../../hooks/use-event-registrations"
import { ClubEventProps } from "../../models/common-props"
import { ConvertRegistrationsToReservations, Reservation } from "../../models/reserve"
import { OverlaySpinner } from "../spinners/overlay-spinner"

const columnHelper = createColumnHelper<Reservation>()

const columns = [
	columnHelper.accessor("sortName", {
		header: "Player",
		cell: (info) => info.getValue(),
		filterFn: "includesString",
	}),
	columnHelper.accessor("signupDate", {
		header: "Signup Date",
		cell: (info) => format(info.getValue(), "MM/dd/yyyy h:mm aaaa"),
		enableGlobalFilter: false,
	}),
	columnHelper.accessor("signedUpBy", {
		header: "Signed Up By",
	}),
]

export function ReservedList({ clubEvent }: ClubEventProps) {
	const { user } = useAuth()
	const { data: registrations, status, fetchStatus } = useEventRegistrations(clubEvent.id)
	const [sorting, setSorting] = useState<SortingState>([{ id: "sortName", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const isMobile = useMediaQuery("(max-width: 576px)")
	const reservations = useMemo(
		() => ConvertRegistrationsToReservations(registrations ?? []),
		[registrations],
	)

	const getRowId = useCallback((row: Reservation) => String(row.slotId), [])

	const table = useReactTable({
		data: reservations,
		columns,
		getRowId,
		enableSortingRemoval: false,
		state: {
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize: isMobile ? 10 : 25,
			},
		},
	})

	// Update page size when screen size changes
	useEffect(() => {
		table.setPageSize(isMobile ? 10 : 25)
	}, [isMobile, table])

	return (
		<div className="card">
			<div className="card-body">
				<h3 className="card-title text-primary">{clubEvent.name}</h3>
				<OverlaySpinner loading={status === "pending" || fetchStatus === "fetching"} />
				{reservations && reservations.length > 0 ? (
					<>
						<input
							type="text"
							className="form-control mb-3"
							placeholder="Search by player name..."
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
						/>
						{isMobile ? (
							<div>
								{table.getRowModel().rows.map((row, idx) => (
									<div
										key={row.id}
										className="border-bottom py-2"
										style={{ backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,.05)" }}
									>
										<div className="fw-bold ps-2">
											{user.isAuthenticated ? (
												<a href={`/directory/${row.original.playerId}`}>{row.original.sortName}</a>
											) : (
												row.original.sortName
											)}
										</div>
										<div className="text-muted small ps-2">
											{format(row.original.signupDate, "MM/dd/yyyy h:mm aaaa")}
										</div>
										<div className="text-muted small ps-2">
											Signed up by: {row.original.signedUpBy}
										</div>
									</div>
								))}
							</div>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table className="table table-striped table-sm">
									<thead>
										{table.getHeaderGroups().map((headerGroup) => (
											<tr key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<th
														key={header.id}
														onClick={header.column.getToggleSortingHandler()}
														style={{ cursor: "pointer", whiteSpace: "nowrap" }}
													>
														{flexRender(header.column.columnDef.header, header.getContext())}
														{{
															asc: " ▲",
															desc: " ▼",
														}[header.column.getIsSorted() as string] ?? ""}
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
														{cell.column.id === "sortName" && user.isAuthenticated ? (
															<a href={`/directory/${row.original.playerId}`}>
																{flexRender(cell.column.columnDef.cell, cell.getContext())}
															</a>
														) : (
															flexRender(cell.column.columnDef.cell, cell.getContext())
														)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						<div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
							<select
								className="form-select"
								style={{ width: "auto" }}
								value={table.getState().pagination.pageSize}
								onChange={(e) => table.setPageSize(Number(e.target.value))}
							>
								{[10, 25, 50, 100, 500].map((pageSize) => (
									<option key={pageSize} value={pageSize}>
										Show {pageSize}
									</option>
								))}
							</select>
							<div>
								<button
									className="btn btn-sm btn-light me-1"
									onClick={() => table.setPageIndex(0)}
									disabled={!table.getCanPreviousPage()}
								>
									«
								</button>
								<button
									className="btn btn-sm btn-light me-1"
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
								>
									‹
								</button>
								<button
									className="btn btn-sm btn-light me-1"
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
								>
									›
								</button>
								<button
									className="btn btn-sm btn-light"
									onClick={() => table.setPageIndex(table.getPageCount() - 1)}
									disabled={!table.getCanNextPage()}
								>
									»
								</button>
							</div>
							<span className="text-muted">
								Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
							</span>
						</div>
					</>
				) : (
					<p>No sign ups yet.</p>
				)}
			</div>
		</div>
	)
}
