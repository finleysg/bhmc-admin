import { resolveEventFromParams } from "@/lib/event-utils"
import { EventRegistrationWrapper } from "./event-registration-wrapper"

interface EventLayoutProps {
	children: React.ReactNode
	params: Promise<{ eventDate: string; eventName: string }>
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
	const { eventDate, eventName } = await params
	const event = await resolveEventFromParams(eventDate, eventName)

	return (
		<EventRegistrationWrapper clubEvent={event}>
			<div>{children}</div>
		</EventRegistrationWrapper>
	)
}
