import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"

import { NewEventForm } from "./components/new-event-form"

export default async function NewEventPage({
	searchParams,
}: {
	searchParams: Promise<{ season?: string }>
}) {
	// The season chosen on the events list; the new event starts in it.
	const requested = Number((await searchParams).season)
	const season = Number.isInteger(requested) && requested > 0 ? requested : new Date().getFullYear()

	return (
		<div className="mx-auto max-w-4xl space-y-6 md:py-8">
			<Card>
				<CardHeader>
					<CardTitle className="font-heading text-xl">New event</CardTitle>
					<CardDescription>
						After you create the event, finish its courses, slots, fees, and sessions in the event
						workspace.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NewEventForm season={season} />
				</CardContent>
			</Card>
		</div>
	)
}
