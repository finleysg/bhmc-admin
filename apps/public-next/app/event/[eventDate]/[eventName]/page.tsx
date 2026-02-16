import { notFound } from "next/navigation"
import { parse, isValid } from "date-fns"
import { fetchDjango } from "@/lib/fetchers"
import { findEventBySlug } from "@/lib/event-utils"
import type { ClubEventDetail } from "@/lib/types"
import { EventDetailCard } from "./components/event-detail-card"
import { FeesAndPointsCard } from "./components/fees-and-points-card"
import { EventDocumentsCard } from "./components/event-documents-card"
import { EventPhotosCard } from "./components/event-photos-card"

interface EventPageProps {
	params: Promise<{ eventDate: string; eventName: string }>
}

export default async function EventPage({ params }: EventPageProps) {
	const { eventDate, eventName } = await params

	const startDate = parse(eventDate, "yyyy-MM-dd", new Date())
	if (!isValid(startDate)) {
		notFound()
	}

	const year = startDate.getFullYear()
	const month = startDate.getMonth() + 1

	const events = await fetchDjango<ClubEventDetail[]>(`/events/?year=${year}&month=${month}`, {
		revalidate: 300,
	})

	const event = findEventBySlug(events, eventDate, eventName)

	if (!event) {
		notFound()
	}

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			<div className="lg:col-span-8">
				<EventDetailCard event={event} />
			</div>
			<div className="space-y-6 lg:col-span-4">
				<FeesAndPointsCard event={event} />
				<EventDocumentsCard eventId={event.id} />
				{event.default_tag && <EventPhotosCard tag={event.default_tag} />}
			</div>
		</div>
	)
}
