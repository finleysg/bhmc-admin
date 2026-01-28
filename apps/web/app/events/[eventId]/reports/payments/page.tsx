"use client"

import { Fragment, useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { Pagination } from "@/components/pagination"
import { ReportPage } from "@/components/report-page"
import { useIsMobile } from "@/lib/use-is-mobile"
import { formatCurrency } from "@/lib/use-report"
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline"
import { PaymentReportDetail, PaymentReportRefund, PaymentReportRow } from "@repo/domain/types"
import {
	ColumnDef,
	ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	Row,
	SortingState,
	useReactTable,
} from "@tanstack/react-table"

const PaymentDetailsSection = ({ row }: { row: Row<PaymentReportRow> }) => {
	const details = row.original.details
	const refunds = row.original.refunds

	return (
		<div className="p-4 bg-base-200 space-y-4">
			{details.length > 0 && (
				<div>
					<h4 className="font-semibold text-sm mb-2">Payment Details</h4>
					<table className="table table-xs">
						<thead>
							<tr>
								<th>Player</th>
								<th>Event Fee</th>
								<th>Amount</th>
								<th>Is Paid</th>
							</tr>
						</thead>
						<tbody>
							{details.map((d: PaymentReportDetail, i: number) => (
								<tr key={i}>
									<td>{d.player}</td>
									<td>{d.eventFee}</td>
									<td>{formatCurrency(d.amount)}</td>
									<td>{d.isPaid ? "Yes" : "No"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{refunds.length > 0 && (
				<div>
					<h4 className="font-semibold text-sm mb-2">Refunds</h4>
					<table className="table table-xs">
						<thead>
							<tr>
								<th>Refund Code</th>
								<th>Refund Amount</th>
								<th>Refund Date</th>
								<th>Issued By</th>
							</tr>
						</thead>
						<tbody>
							{refunds.map((r: PaymentReportRefund, i: number) => (
								<tr key={i}>
									<td>{r.refundCode}</td>
									<td>{formatCurrency(r.refundAmount)}</td>
									<td>{r.refundDate}</td>
									<td>{r.issuedBy}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

const PaymentsTable = ({ data }: { data: PaymentReportRow[] | null }) => {
	const isMobile = useIsMobile()
	const [sorting, setSorting] = useState<SortingState>([{ id: "userName", desc: false }])
	const [globalFilter, setGlobalFilter] = useState("")
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const columns: ColumnDef<PaymentReportRow>[] = [
		{
			accessorKey: "userName",
			header: "User Name",
			enableSorting: true,
		},
		{
			accessorKey: "paymentId",
			header: "Payment ID",
			enableSorting: true,
		},
		{
			accessorKey: "paymentCode",
			header: "Payment Code",
			enableSorting: true,
		},
		{
			accessorKey: "paymentDate",
			header: "Payment Date",
			enableSorting: true,
		},
		{
			accessorKey: "confirmDate",
			header: "Confirm Date",
			enableSorting: true,
		},
		{
			accessorKey: "amountPaid",
			header: "Amount Paid",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue<number>()),
		},
		{
			accessorKey: "transactionFee",
			header: "Transaction Fee",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue<number>()),
		},
		{
			accessorKey: "amountRefunded",
			header: "Amount Refunded",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue<number>()),
		},
	]

	useEffect(() => {
		if (!data || data.length === 0) return

		const visibility: Record<string, boolean> = {}

		const mobileVisibleColumns = [
			"userName",
			"paymentId",
			"paymentDate",
			"amountPaid",
			"amountRefunded",
		]

		const allColumnKeys = [
			"userName",
			"paymentId",
			"paymentCode",
			"paymentDate",
			"confirmDate",
			"amountPaid",
			"transactionFee",
			"amountRefunded",
		]

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
			expanded,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		onColumnVisibilityChange: setColumnVisibility,
		onExpandedChange: setExpanded,
		getRowCanExpand: (row) => row.original.details.length > 0 || row.original.refunds.length > 0,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
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
							<Fragment key={row.id}>
								<tr
									className={row.getCanExpand() ? "cursor-pointer hover" : ""}
									onClick={() => row.getCanExpand() && row.toggleExpanded()}
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
								{row.getIsExpanded() && (
									<tr>
										<td colSpan={row.getVisibleCells().length}>
											<PaymentDetailsSection row={row} />
										</td>
									</tr>
								)}
							</Fragment>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<Pagination table={table} />
		</>
	)
}

export default function PaymentReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<PaymentReportRow[]>
			title="Payment Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/payments`}
			excelPath={`/api/events/${eventId}/reports/payments/excel`}
			filenamePrefix="payment-report"
		>
			{(data) => <PaymentsTable data={data} />}
		</ReportPage>
	)
}
