"use client"

import {
	useEffect,
	useState,
} from "react"

import Link from "next/link"
import {
	useParams,
	useRouter,
} from "next/navigation"

import { useSession } from "@/lib/auth-client"
import {
	ArrowDownIcon,
	ArrowsUpDownIcon,
	ArrowUpIcon,
} from "@heroicons/react/24/outline"
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

export default function EventReportPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	const [reportData, setReportData] = useState<EventReportRowDto[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [sorting, setSorting] = useState<SortingState>([{ id: "teamId", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

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

	// Create table instance
	const table = useReactTable({
		data: reportData,
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
					<Link href={`/events/${eventId}/reports`} className="btn btn-outline">
						Back to Reports
					</Link>
				</div>

				{reportData.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No report data available for this event.</p>
					</div>
				) : (
					<>
						{/* Global Filter */}
						<div className="mb-4">
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
						<div className="flex items-center justify-between mt-4">
							<div className="flex items-center gap-2">
								<span className="text-xs text-nowrap">
									Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
								</span>
								<select
									value={table.getState().pagination.pageSize}
									onChange={(e) => table.setPageSize(Number(e.target.value))}
									className="select select-bordered select-sm"
								>
									{[25, 50, 100, 500].map((size) => (
										<option key={size} value={size}>
											{size} rows
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<button
									className="btn btn-sm"
									onClick={() => table.setPageIndex(0)}
									disabled={!table.getCanPreviousPage()}
								>
									{"<<"}
								</button>
								<button
									className="btn btn-sm"
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
								>
									{"<"}
								</button>
								<button
									className="btn btn-sm"
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
								>
									{">"}
								</button>
								<button
									className="btn btn-sm"
									onClick={() => table.setPageIndex(table.getPageCount() - 1)}
									disabled={!table.getCanNextPage()}
								>
									{">>"}
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</main>
	)
}
