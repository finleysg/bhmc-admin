import Link from "next/link"
import { cn } from "@/lib/utils"
import { EventStatusType, getEventTypeColor, getEventUrl } from "@/lib/event-utils"
import type { ClubEventDetail } from "@/lib/types"

interface CalendarEventLinkProps {
	event: ClubEventDetail
}

export function CalendarEventLink({ event }: CalendarEventLinkProps) {
	const isCanceled = event.status === EventStatusType.Canceled
	const url = event.external_url || getEventUrl(event)
	const isExternal = Boolean(event.external_url)

	return (
		<Link
			href={url}
			target={isExternal ? "_blank" : undefined}
			rel={isExternal ? "noopener noreferrer" : undefined}
			className={cn(
				"mt-0.5 block rounded px-1 py-0.5 text-xs leading-tight",
				getEventTypeColor(event.event_type, true),
				isCanceled && "line-through opacity-60",
			)}
			title={event.name}
		>
			<p className="truncate font-medium">{event.name}</p>
			{event.start_time && <p className="truncate opacity-80">{event.start_time}</p>}
		</Link>
	)
}
