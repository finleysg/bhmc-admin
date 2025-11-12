"use client"

import { useEffect } from "react"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { useSession } from "../../../../../lib/auth-client"

export default function EventReportPage() {
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

	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<div className="w-full max-w-3xl text-center">
				<h2 className="text-3xl font-bold mb-4">Event Report</h2>
				<p className="text-muted-foreground mb-8">Coming soon</p>
				<Link href={`/events/${eventId}/reports`} className="btn btn-primary">
					Back to Reports
				</Link>
			</div>
		</main>
	)
}
