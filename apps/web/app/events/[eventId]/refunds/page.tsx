"use client"

import { useEffect, useReducer, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type {
	BulkRefundPreview,
	BulkRefundProgressEvent,
	BulkRefundResponse,
} from "@repo/domain/types"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"

type RefundPhase = "preview" | "processing" | "complete" | "error"

interface RefundState {
	phase: RefundPhase
	current: number
	total: number
	playerName: string
	error: string | null
	result: BulkRefundResponse | null
}

type RefundAction =
	| { type: "START_PROCESSING"; total: number }
	| { type: "PROGRESS"; current: number; total: number; playerName: string }
	| { type: "COMPLETE"; result: BulkRefundResponse }
	| { type: "ERROR"; error: string }

function refundReducer(state: RefundState, action: RefundAction): RefundState {
	switch (action.type) {
		case "START_PROCESSING":
			return {
				...state,
				phase: "processing",
				current: 0,
				total: action.total,
				playerName: "",
				error: null,
				result: null,
			}
		case "PROGRESS":
			return {
				...state,
				current: action.current,
				total: action.total,
				playerName: action.playerName,
			}
		case "COMPLETE":
			return {
				...state,
				phase: "complete",
				result: action.result,
			}
		case "ERROR":
			return {
				...state,
				phase: "error",
				error: action.error,
			}
	}
}

const initialRefundState: RefundState = {
	phase: "preview",
	current: 0,
	total: 0,
	playerName: "",
	error: null,
	result: null,
}

export default function BulkRefundPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const { eventId } = useParams<{ eventId: string }>()

	const [preview, setPreview] = useState<BulkRefundPreview | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [refundState, dispatch] = useReducer(refundReducer, initialRefundState)

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

	const handleRefundAll = () => {
		if (!eventId || !preview) return

		dispatch({ type: "START_PROCESSING", total: preview.payments.length })

		const eventSource = new EventSource(`/api/registration/bulk-refund?eventId=${eventId}`)

		eventSource.onmessage = (event) => {
			try {
				const progressData = JSON.parse(event.data as string) as BulkRefundProgressEvent

				if (progressData.status === "processing") {
					dispatch({
						type: "PROGRESS",
						current: progressData.current,
						total: progressData.total,
						playerName: progressData.playerName ?? "",
					})
				} else if (progressData.status === "complete" && progressData.result) {
					dispatch({ type: "COMPLETE", result: progressData.result })
					eventSource.close()
				} else if (progressData.status === "error") {
					dispatch({ type: "ERROR", error: progressData.error ?? "Unknown error" })
					eventSource.close()
				}
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : "Failed to parse progress data"
				console.error(errorMessage)
				dispatch({ type: "ERROR", error: errorMessage })
				eventSource.close()
			}
		}

		eventSource.onerror = () => {
			dispatch({ type: "ERROR", error: "Connection lost" })
			eventSource.close()
		}
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

	// Processing phase - show progress
	if (refundState.phase === "processing") {
		const progressPercent =
			refundState.total > 0 ? Math.round((refundState.current / refundState.total) * 100) : 0

		return (
			<PageLayout maxWidth="5xl">
				<Card shadow="sm">
					<CardBody>
						<CardTitle>Processing Refunds</CardTitle>
						<div className="py-8">
							<div className="mb-4">
								<progress
									className="progress progress-primary w-full"
									value={refundState.current}
									max={refundState.total}
								/>
							</div>
							<p className="text-center text-base-content/70 mb-2">
								{refundState.current} of {refundState.total} ({progressPercent}%)
							</p>
							{refundState.playerName && (
								<p className="text-center text-sm text-base-content/50">
									Processing: {refundState.playerName}
								</p>
							)}
						</div>
					</CardBody>
				</Card>
			</PageLayout>
		)
	}

	// Complete phase - show results
	if (refundState.phase === "complete" && refundState.result) {
		const { refundedCount, failedCount, totalRefundAmount, results } = refundState.result
		const failures = results.filter((r) => !r.success)

		return (
			<PageLayout maxWidth="5xl">
				<Card shadow="sm">
					<CardBody>
						<CardTitle>Refund Complete</CardTitle>
						<div className="py-4">
							<Alert type="success" className="mb-4">
								Successfully processed {refundedCount} refund(s) totaling $
								{totalRefundAmount.toFixed(2)}
							</Alert>

							{failedCount > 0 && (
								<Alert type="warning" className="mb-4">
									{failedCount} refund(s) failed
								</Alert>
							)}

							{failures.length > 0 && (
								<div className="mb-4">
									<h3 className="font-semibold mb-2">Failed Refunds:</h3>
									<ul className="list-disc list-inside text-sm text-error">
										{failures.map((failure) => (
											<li key={failure.paymentId}>
												Payment #{failure.paymentId}: {failure.error}
											</li>
										))}
									</ul>
								</div>
							)}

							<div className="flex justify-end">
								<button
									onClick={() => router.push(`/events/${eventId}`)}
									className="btn btn-primary"
								>
									Back to Event
								</button>
							</div>
						</div>
					</CardBody>
				</Card>
			</PageLayout>
		)
	}

	// Error phase from SSE
	if (refundState.phase === "error") {
		return (
			<PageLayout maxWidth="5xl">
				<Card shadow="sm">
					<CardBody>
						<CardTitle>Bulk Refunds</CardTitle>
						<Alert type="error" className="mb-4">
							{refundState.error}
						</Alert>
						<button onClick={() => router.push(`/events/${eventId}`)} className="btn btn-neutral">
							Back to Event
						</button>
					</CardBody>
				</Card>
			</PageLayout>
		)
	}

	// Preview phase (default)
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
								<button className="btn btn-error" onClick={handleRefundAll}>
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
