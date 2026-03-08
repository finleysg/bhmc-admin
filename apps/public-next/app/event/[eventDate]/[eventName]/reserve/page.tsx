import { redirect } from "next/navigation"

import { getEventUrl, resolveEventFromParams, shouldShowSignUpButton } from "@/lib/event-utils"
import { ReservePageContent } from "./reserve-page-content"

interface ReservePageProps {
	params: Promise<{ eventDate: string; eventName: string }>
}

export default async function ReservePage({ params }: ReservePageProps) {
	const { eventDate, eventName } = await params
	const event = await resolveEventFromParams(eventDate, eventName)

	if (!event.can_choose || !shouldShowSignUpButton(event, new Date())) {
		redirect(getEventUrl(event))
	}

	return <ReservePageContent event={event} />
}
