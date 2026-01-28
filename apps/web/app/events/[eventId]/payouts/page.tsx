"use client"

import { useParams } from "next/navigation"

import LinkCard from "@/components/link-card"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"

export default function EventPayoutsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<PageLayout maxWidth="3xl">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<LinkCard
					title="Post Credit"
					description="View and post pro shop credit payouts."
					href={`/events/${eventId}/payouts/credit`}
					icon={"🏷️"}
				/>
				<LinkCard
					title="Post Cash"
					description="View and post skins cash payouts."
					href={`/events/${eventId}/payouts/cash`}
					icon={"💵"}
				/>
			</div>
		</PageLayout>
	)
}
