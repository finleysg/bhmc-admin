"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { PayoutSummary } from "@repo/domain/types"
import { useAuth } from "@/lib/auth-context"
import { formatCurrency } from "@/lib/use-report"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { PageLayout } from "@/components/ui/page-layout"

export default function CreditPayoutPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	const [payouts, setPayouts] = useState<PayoutSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [marking, setMarking] = useState(false)
	const [marked, setMarked] = useState(false)
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
		null,
	)

	const fetchPayouts = useCallback(async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/payouts?payoutType=Credit`)
			if (!response.ok) {
				throw new Error(`Failed to fetch payouts: ${response.status}`)
			}
			const data = (await response.json()) as PayoutSummary[]
			setPayouts(data)
		} catch (err) {
			console.error("Error fetching credit payouts:", err)
			setError("Failed to load credit payouts")
		} finally {
			setLoading(false)
		}
	}, [eventId])

	useEffect(() => {
		if (!signedIn || !eventId) return
		void fetchPayouts()
	}, [eventId, signedIn, fetchPayouts])

	const handleMarkPaid = async () => {
		setMarking(true)
		setFeedback(null)
		try {
			const response = await fetch(`/api/events/${eventId}/payouts/mark-paid`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ payoutType: "Credit" }),
			})
			if (!response.ok) {
				const body = (await response.json()) as { message?: string }
				throw new Error(body.message || `Failed to mark paid: ${response.status}`)
			}
			setMarked(true)
			setFeedback({ type: "success", message: "Credit payouts marked as paid" })
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to mark payouts as paid"
			setFeedback({ type: "error", message })
		} finally {
			setMarking(false)
		}
	}

	if (isPending || loading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	if (error) {
		return (
			<PageLayout maxWidth="3xl">
				<div className="text-center p-8">
					<p className="text-error">{error}</p>
				</div>
			</PageLayout>
		)
	}

	if (payouts.length === 0) {
		return (
			<PageLayout maxWidth="3xl">
				<EmptyState message="No credit payouts found for this event." />
			</PageLayout>
		)
	}

	return (
		<PageLayout maxWidth="3xl">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<button
						className="btn btn-primary btn-sm"
						onClick={() => void handleMarkPaid()}
						disabled={marking || marked}
					>
						{marking ? (
							<>
								<span className="loading loading-spinner loading-sm"></span>
								Marking...
							</>
						) : (
							"Mark Paid"
						)}
					</button>
				</div>
				{feedback && (
					<div className={`text-sm ${feedback.type === "success" ? "text-success" : "text-error"}`}>
						{feedback.message}
					</div>
				)}
				<div className="overflow-x-auto bg-base-100">
					<table className="table table-zebra table-xs">
						<thead>
							<tr>
								<th className="text-left text-xs">Player Name</th>
								<th className="text-left text-xs">Total Amount</th>
							</tr>
						</thead>
						<tbody>
							{payouts.map((payout) => (
								<tr key={payout.playerId}>
									<td>{payout.playerName}</td>
									<td>{formatCurrency(payout.totalAmount)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</PageLayout>
	)
}
