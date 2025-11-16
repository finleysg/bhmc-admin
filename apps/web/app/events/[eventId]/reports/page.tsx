"use client"

import { useEffect } from "react"

import { useParams, useRouter } from "next/navigation"

import { useSession } from "../../../../lib/auth-client"
import ReportCard from "../../../components/report-card"

export default function EventReportsPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const params = useParams()
	const eventId = params.eventId as string

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	if (isPending) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
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
	]

	return (
		<main className="min-h-screen p-8">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{reports.map((report) => (
						<ReportCard
							key={report.title}
							title={report.title}
							description={report.description}
							href={report.href}
						/>
					))}
				</div>
			</div>
		</main>
	)
}
