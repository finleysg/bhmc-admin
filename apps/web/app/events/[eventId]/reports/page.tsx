"use client"

import { useParams } from "next/navigation"

import { useAuth } from "../../../../lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import LinkCard from "../../../components/link-card"

export default function EventReportsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	if (!eventId || !Number(eventId)) {
		return (
			<div className="flex items-center justify-center p-8">
				<p>Invalid event ID</p>
			</div>
		)
	}

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	const reports = [
		{
			title: "Event Report",
			description: "Overview of event details, attendance, and timeline",
			href: `/events/${eventId}/reports/event`,
		},
		{
			title: "Points Report",
			description: "Player points accumulation and standings",
			href: `/events/${eventId}/reports/points`,
		},
		{
			title: "Results Report",
			description: "Final scores, winners, and tournament outcomes",
			href: `/events/${eventId}/reports/results`,
		},
		{
			title: "Finance Report",
			description: "Fees, payments, and budget summary",
			href: `/events/${eventId}/reports/finance`,
		},
		{
			title: "Payment Report",
			description: "Per-event payment details, fees, and refunds",
			href: `/events/${eventId}/reports/payments`,
		},
	]

	return (
		<main className="min-h-screen md:p-8">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{reports.map((report) => (
						<LinkCard
							key={report.title}
							title={report.title}
							description={report.description}
							href={report.href}
							buttonLabel="View Report"
						/>
					))}
				</div>
			</div>
		</main>
	)
}
