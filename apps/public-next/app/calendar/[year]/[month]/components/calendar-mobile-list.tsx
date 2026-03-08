import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { EventStatusType, getEventTypeColor, getEventUrl } from "@/lib/event-utils"
import type { CalendarMonth } from "@/lib/calendar"
import type { ClubEventDetail } from "@/lib/types"

interface CalendarMobileListProps {
	calendar: CalendarMonth
}

interface DayEvent {
	date: Date
	event: ClubEventDetail
}

export function CalendarMobileList({ calendar }: CalendarMobileListProps) {
	const dayEvents: DayEvent[] = []

	for (const week of calendar.weeks) {
		for (const day of week.days) {
			if (day.isCurrentMonth && day.events.length > 0) {
				for (const event of day.events) {
					dayEvents.push({ date: day.date, event })
				}
			}
		}
	}

	if (dayEvents.length === 0) {
		return <p className="py-4 text-center text-muted-foreground">No events this month</p>
	}

	return (
		<div className="space-y-2">
			{dayEvents.map(({ date, event }) => {
				const isCanceled = event.status === EventStatusType.Canceled
				const url = event.external_url || getEventUrl(event)
				const isExternal = Boolean(event.external_url)

				return (
					<Link
						key={`${event.id}-${date.toISOString()}`}
						href={url}
						target={isExternal ? "_blank" : undefined}
						rel={isExternal ? "noopener noreferrer" : undefined}
						className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
					>
						<div className="text-center">
							<div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
							<div className="text-lg font-semibold">{format(date, "d")}</div>
						</div>
						<div className="min-w-0 flex-1">
							<p
								className={cn(
									"truncate text-sm font-medium",
									isCanceled && "line-through opacity-60",
								)}
							>
								{event.name}
							</p>
							{event.start_time && (
								<p className="text-xs text-muted-foreground">{event.start_time}</p>
							)}
						</div>
						<span
							className={cn(
								"shrink-0 rounded px-1.5 py-0.5 text-xs",
								getEventTypeColor(event.event_type),
							)}
						>
							{event.event_type}
						</span>
					</Link>
				)
			})}
		</div>
	)
}
