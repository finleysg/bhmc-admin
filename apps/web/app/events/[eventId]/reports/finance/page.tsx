"use client"

import { useParams } from "next/navigation"

import { ReportPage } from "@/components/report-page"
import { formatCurrency } from "@/lib/use-report"
import { FinanceReportSummary } from "@repo/domain/types"

const FinanceSummary = ({ data }: { data: FinanceReportSummary | null }) => {
	if (!data) return null

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body font-mono text-sm">
				{/* Fee type sums */}
				{data.feeTypeSums.map((fee) => (
					<div key={fee.feeTypeName} className="flex justify-between">
						<span>{fee.feeTypeName}</span>
						<span>{formatCurrency(fee.amount)}</span>
					</div>
				))}

				{/* Collection totals */}
				<div className="flex justify-between">
					<span>Total collected online</span>
					<span>{formatCurrency(data.totalCollectedOnline)}</span>
				</div>
				<div className="flex justify-between">
					<span>Collected cash</span>
					<span>{formatCurrency(data.collectedCash)}</span>
				</div>
				<div className="flex justify-between font-bold">
					<span>Total collected</span>
					<span>{formatCurrency(data.totalCollected)}</span>
				</div>

				<div className="divider my-1"></div>

				{/* Payouts */}
				<div className="flex justify-between">
					<span>Pro shop payouts</span>
					<span>{formatCurrency(data.proShopPayouts)}</span>
				</div>
				<div className="flex justify-between">
					<span>Cash payouts</span>
					<span>{formatCurrency(data.cashPayouts)}</span>
				</div>
				<div className="flex justify-between font-bold">
					<span>Total payouts</span>
					<span>{formatCurrency(data.totalPayouts)}</span>
				</div>

				<div className="divider my-1"></div>

				{/* Pass-through fees */}
				<div className="flex justify-between">
					<span>Green fees</span>
					<span>{formatCurrency(data.greenFees)}</span>
				</div>
				<div className="flex justify-between">
					<span>Cart fees</span>
					<span>{formatCurrency(data.cartFees)}</span>
				</div>
				<div className="flex justify-between font-bold">
					<span>Total pass-through fees</span>
					<span>{formatCurrency(data.totalPassThrough)}</span>
				</div>

				<div className="divider my-1"></div>

				{/* Balance */}
				<div className="flex justify-between font-bold text-base">
					<span>Balance</span>
					<span>{formatCurrency(data.balance)}</span>
				</div>
			</div>
		</div>
	)
}

export default function FinanceReportPage() {
	const params = useParams()
	const eventId = params.eventId as string

	return (
		<ReportPage<FinanceReportSummary>
			title="Finance Report"
			eventId={eventId}
			fetchPath={`/api/events/${eventId}/reports/finance`}
			excelPath={`/api/events/${eventId}/reports/finance/excel`}
			filenamePrefix="finance-report"
		>
			{(data) => <FinanceSummary data={data} />}
		</ReportPage>
	)
}
