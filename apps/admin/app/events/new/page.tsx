import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"

import { EventSettingsForm } from "../components/event-settings-form"

import { createEvent } from "./actions"

export default function NewEventPage() {
	return (
		<div className="mx-auto max-w-4xl space-y-6 md:py-8">
			<Card>
				<CardHeader>
					<CardTitle className="font-heading text-xl">New event</CardTitle>
					<CardDescription>
						After you create the event, add its courses, fees, sessions, and slots in the event
						workspace. To start from an existing event, copy it instead.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<EventSettingsForm action={createEvent} submitLabel="Create event" cancelHref="/events" />
				</CardContent>
			</Card>
		</div>
	)
}
