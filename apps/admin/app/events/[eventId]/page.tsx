import { notFound } from "next/navigation"

import LinkCard from "@/components/link-card"
import { PageLayout } from "@/components/ui/page-layout"

export default async function EventHubPage({ params }: { params: Promise<{ eventId: string }> }) {
	const eventId = Number((await params).eventId)
	if (!Number.isInteger(eventId)) notFound()

	return (
		<PageLayout maxWidth="5xl">
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<LinkCard
					title="Event Setup"
					description="Settings, courses, slots, fees, sessions, and copying the event."
					href={`/events/${eventId}/setup`}
					icon={"⚙️"}
				/>

				<LinkCard
					title="Ready to Open Registration"
					description="What still needs fixing before registration opens."
					href={`/events/${eventId}/readiness`}
					icon={"🚦"}
				/>

				<LinkCard
					title="Player Management"
					description="Manage player change requests (add, move, drop, etc)."
					href={`/events/${eventId}/players`}
					disabled={false}
					icon={"🏌️‍♂️"}
				/>

				<LinkCard
					title="Registration Inspector"
					description="Diagnose a registration: slots, fees, payments, and Stripe."
					href={`/events/${eventId}/inspector`}
					icon={"🔍"}
				/>

				<LinkCard
					title="Golf Genius Integration"
					description="Sync and integrate with Golf Genius."
					href={`/events/${eventId}/golf-genius`}
					disabled={false}
					icon={"🧠"}
				/>

				<LinkCard
					title="Event Reporting"
					description="Generate reports for this event."
					href={`/events/${eventId}/reports`}
					disabled={false}
					icon={"📊"}
				/>

				<LinkCard
					title="Event Documents"
					description="Manage documents for this event."
					href={`/events/${eventId}/documents`}
					disabled={false}
					icon={"📄"}
				/>

				<LinkCard
					title="Event Status"
					description="View event configuration status and admin actions."
					href={`/events/${eventId}/status`}
					disabled={false}
					icon={"✅"}
				/>

				<LinkCard
					title="Payout Status"
					description="View and manage event payouts."
					href={`/events/${eventId}/payouts`}
					disabled={false}
					icon={"💰"}
				/>
			</div>
		</PageLayout>
	)
}
