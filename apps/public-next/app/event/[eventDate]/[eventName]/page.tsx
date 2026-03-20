import { notFound } from "next/navigation"
import { parse, isValid } from "date-fns"
import { fetchDjango } from "@/lib/fetchers"
import { findEventBySlug, computeOpenSpots, RegistrationType } from "@/lib/event-utils"
import type { ClubEventDetail, RegistrationSlot } from "@/lib/types"
import { EventDetailCard } from "./components/event-detail-card"
import { FeesAndPointsCard } from "./components/fees-and-points-card"
import { EventDocumentsCard } from "./components/event-documents-card"
import { EventPhotosCard } from "./components/event-photos-card"
import { RegistrationActions, RegistrationBanner } from "./components/registration-actions"

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
		tags: ["events"],
	})

	const event = findEventBySlug(events, eventDate, eventName)

	if (!event) {
		notFound()
	}

	let openSpots = -1
	const hasRegistration = event.registration_type !== RegistrationType.None
	if (hasRegistration && event.registration_window !== "past") {
		try {
			const slots = await fetchDjango<RegistrationSlot[]>(
				`/registration-slots/?event_id=${event.id}`,
				{ revalidate: 60, tags: [`event-slots-${event.id}`] },
			)
			openSpots = computeOpenSpots(event, slots)
		} catch {
			// If slots can't be fetched, skip showing spots
		}
	}
	const isEventFull = openSpots === 0

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			<div className="lg:col-span-8">
				<EventDetailCard
					event={event}
					actions={<RegistrationActions event={event} isEventFull={isEventFull} />}
					banner={<RegistrationBanner event={event} isEventFull={isEventFull} />}
				/>
			</div>
			<div className="space-y-6 lg:col-span-4">
				<FeesAndPointsCard event={event} openSpots={openSpots} />
				<EventDocumentsCard eventId={event.id} />
				{event.default_tag && <EventPhotosCard tag={event.default_tag} />}
			</div>
		</div>
	)
}
