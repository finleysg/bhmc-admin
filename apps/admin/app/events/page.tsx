import Link from "next/link"

import { getEventTypeName, parseLocalDate } from "@repo/domain/functions"
import { EventTypeChoices, RegistrationTypeChoices, type ClubEvent } from "@repo/domain/types"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import { apiGet } from "@/lib/server-api"

import { ScrollToUpcoming } from "./components/scroll-to-upcoming"
import { SeasonSelect } from "./components/season-select"

const eventTypeColor: Record<string, string> = {
	[EventTypeChoices.WEEKNIGHT]: "text-success",
	[EventTypeChoices.WEEKEND_MAJOR]: "text-info",
	[EventTypeChoices.OPEN]: "text-secondary",
	[EventTypeChoices.OTHER]: "text-error",
}

function formatDate(dateString: string) {
	return parseLocalDate(dateString).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})
}

export default async function EventsPage({
	searchParams,
}: {
	searchParams: Promise<{ season?: string }>
}) {
	const requested = Number((await searchParams).season)
	const season = Number.isInteger(requested) && requested > 0 ? requested : new Date().getFullYear()

	const events = (await apiGet<ClubEvent[]>(`/events?season=${season}`))
		.filter((e) => e.registrationType !== RegistrationTypeChoices.NONE)
		.sort((a, b) => a.startDate.localeCompare(b.startDate))
	const today = new Date().toISOString().slice(0, 10)
	const upcomingId = events.find((e) => e.startDate >= today)?.id

	return (
		<div className="mx-auto max-w-3xl space-y-4 md:py-8">
			<div className="flex items-center justify-between">
				<h2 className="font-heading text-2xl font-bold">Events</h2>
				<Button asChild>
					<Link href="/events/new">New event</Link>
				</Button>
			</div>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{season} season</CardTitle>
					<SeasonSelect season={season} />
				</CardHeader>
				<CardContent>
					{events.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground">No events found</p>
					) : (
						<ScrollToUpcoming className="max-h-[70vh] overflow-y-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Event</TableHead>
										<TableHead>Type</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{events.map((event) => (
										<TableRow
											key={event.id}
											data-upcoming={event.id === upcomingId ? "" : undefined}
											className="relative cursor-pointer"
										>
											<TableCell className="whitespace-nowrap">
												{formatDate(event.startDate)}
											</TableCell>
											<TableCell>
												<Link
													href={`/events/${event.id}`}
													// Stretched link: its click area covers the whole row.
													className="after:absolute after:inset-0"
												>
													{event.name}
												</Link>
											</TableCell>
											<TableCell
												className={`whitespace-nowrap font-medium ${eventTypeColor[event.eventType] ?? ""}`}
											>
												{getEventTypeName(event.eventType)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollToUpcoming>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
