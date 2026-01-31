"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { BulkRefundPreview } from "@repo/domain/types"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"

export default function BulkRefundPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const { eventId } = useParams<{ eventId: string }>()

	const [preview, setPreview] = useState<BulkRefundPreview | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!signedIn || !eventId) return

		const fetchPreview = async () => {
			try {
				const response = await fetch(`/api/registration/bulk-refund-preview?eventId=${eventId}`)
				if (!response.ok) {
					const errorBody = await response.text()
					throw new Error(`Failed to fetch preview: ${errorBody}`)
				}
				const data = (await response.json()) as BulkRefundPreview
				setPreview(data)
			} catch (err) {
				console.error("Error fetching bulk refund preview:", err)
				setError(err instanceof Error ? err.message : "Failed to load preview")
			} finally {
				setLoading(false)
			}
		}

		void fetchPreview()
	}, [eventId, signedIn])

	if (isPending || loading) {
		return (
			<PageLayout maxWidth="5xl">
				<LoadingSpinner size="lg" />
			</PageLayout>
		)
	}

	if (!signedIn) {
		return null
	}

	if (error) {
		return (
			<PageLayout maxWidth="5xl">
				<Card shadow="sm">
					<CardBody>
						<CardTitle>Bulk Refunds</CardTitle>
						<Alert type="error" className="mb-4">
							{error}
						</Alert>
						<button onClick={() => router.push(`/events/${eventId}`)} className="btn btn-neutral">
							Back to Event
						</button>
					</CardBody>
				</Card>
			</PageLayout>
		)
	}

	const hasPayments = preview && preview.payments.length > 0

	return (
		<PageLayout maxWidth="5xl">
			<Card shadow="sm">
				<CardBody>
					<CardTitle>Bulk Refunds</CardTitle>

					{!hasPayments && (
						<div className="text-center py-8">
							<p className="text-base-content/70 mb-4">
								No refundable payments found for this event.
							</p>
							<button onClick={() => router.push(`/events/${eventId}`)} className="btn btn-neutral">
								Back to Event
							</button>
						</div>
					)}

					{hasPayments && (
						<>
							<div className="overflow-x-auto mb-6">
								<table className="table table-zebra w-full">
									<thead>
										<tr>
											<th>Player Name</th>
											<th className="text-right">Fee Count</th>
											<th className="text-right">Refund Amount</th>
										</tr>
									</thead>
									<tbody>
										{preview.payments.map((payment) => (
											<tr key={payment.paymentId}>
												<td>{payment.playerName}</td>
												<td className="text-right">{payment.feeCount}</td>
												<td className="text-right">${payment.refundAmount.toFixed(2)}</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="font-semibold">
											<td>Total</td>
											<td className="text-right">
												{preview.payments.reduce((sum, p) => sum + p.feeCount, 0)}
											</td>
											<td className="text-right">${preview.totalRefundAmount.toFixed(2)}</td>
										</tr>
									</tfoot>
								</table>
							</div>

							{preview.skippedCount > 0 && (
								<p className="text-sm text-base-content/70 mb-4">
									{preview.skippedCount} payment(s) skipped (no paid fees).
								</p>
							)}

							<div className="flex gap-2 justify-end">
								<button onClick={() => router.push(`/events/${eventId}`)} className="btn btn-ghost">
									Cancel
								</button>
								<button className="btn btn-error" disabled={!hasPayments}>
									Refund All
								</button>
							</div>
						</>
					)}
				</CardBody>
			</Card>
		</PageLayout>
	)
}
