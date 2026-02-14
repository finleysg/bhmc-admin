import Link from "next/link"
import { addDays, isWithinInterval, parse, subDays } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dayAndDateFormat, isoDayFormat } from "@/lib/date-utils"
import { slugify } from "@/lib/slugify"
import type { ClubEvent } from "@/lib/types"

interface UpcomingEventsProps {
	events: ClubEvent[]
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
	const now = new Date()
	const threeDaysAgo = subDays(now, 3)
	const twoWeeksFromNow = addDays(now, 14)

	const upcoming = events.filter((e) => {
		if ("MNOPW".indexOf(e.event_type) < 0) return false
		const startDate = parse(e.start_date, "yyyy-MM-dd", new Date())
		return isWithinInterval(startDate, { start: threeDaysAgo, end: twoWeeksFromNow })
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Upcoming Events</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{upcoming.map((event) => {
						const startDate = parse(event.start_date, "yyyy-MM-dd", new Date())
						const eventUrl = `/event/${isoDayFormat(startDate)}/${slugify(event.name)}`
						const isCanceled = event.status === "C"
						return (
							<Link
								key={event.id}
								href={eventUrl}
								className="flex items-start gap-3 rounded-md p-1 transition-colors hover:bg-accent"
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
									{event.name[0]}
								</span>
								<div className={isCanceled ? "line-through opacity-60" : ""}>
									<p className="text-sm font-medium">{event.name}</p>
									<p className="text-xs text-muted-foreground">{dayAndDateFormat(startDate)}</p>
								</div>
							</Link>
						)
					})}
					{upcoming.length === 0 && (
						<p className="text-sm text-muted-foreground">No upcoming events.</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
