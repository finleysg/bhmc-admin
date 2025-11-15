"use client"

import { useState } from "react"

import { useParams } from "next/navigation"

import { formatCurrency } from "@/lib/use-report"
import { FinanceReportDto } from "@repo/dto"
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
} from "@tanstack/react-table"

import { ReportPage } from "../../../../components/report-page"

const FinanceTable = ({ data }: { data: FinanceReportDto | null }) => {
	const [sorting, setSorting] = useState<SortingState>([])

	// Prepare table data from the finance report
	const tableData = data
		? [
				{
					bucket: "Credit",
					grossCollected: data.creditCollected,
					refunds: data.creditRefunds,
					netInflow: data.creditNet,
					totalPayouts: data.creditTotalPayouts,
					netProfit: data.creditNet - data.creditTotalPayouts,
				},
				{
					bucket: "Cash",
					grossCollected: data.cashCollected,
					refunds: data.cashRefunds,
					netInflow: data.cashNet,
					totalPayouts: data.cashTotalPayouts,
					netProfit: data.cashNet - data.cashTotalPayouts,
				},
				{
					bucket: "Passthru",
					grossCollected: data.passthruCollected,
					refunds: data.passthruRefunds,
					netInflow: data.passthruNet,
					totalPayouts: 0,
					netProfit: data.passthruNet - 0,
				},
			]
		: []

	// Define fixed columns
	const fixedColumns: ColumnDef<Record<string, unknown>>[] = [
		{
			accessorKey: "bucket",
			header: "Bucket",
			enableSorting: true,
		},
		{
			accessorKey: "grossCollected",
			header: "Gross Collected",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
		{
			accessorKey: "refunds",
			header: "Refunds",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
		{
			accessorKey: "netInflow",
			header: "Net Inflow",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
		{
			accessorKey: "totalPayouts",
			header: "Total Payouts",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
		{
			accessorKey: "netProfit",
			header: "Net Profit",
			enableSorting: true,
			cell: ({ getValue }) => formatCurrency(getValue() as number),
		},
	]

	const allColumns = fixedColumns

	// Create table instance
	const table = useReactTable({
		data: tableData,
		columns: allColumns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	})

	return (
		<div className="overflow-x-auto bg-base-100">
			<table className="table table-zebra table-xs">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th key={header.id} className="text-left text-xs">
									{header.isPlaceholder ? null : (
										<div className="cursor-pointer select-none flex items-center">
											{flexRender(header.column.columnDef.header, header.getContext())}
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
	)
}

export default function FinanceReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<FinanceReportDto>
			title="Finance Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/finance`}
			excelPath={`/api/events/${eventId}/reports/finance/excel`}
			filenamePrefix="finance-report"
		>
			{(data) => <FinanceTable data={data} />}
		</ReportPage>
	)
}
