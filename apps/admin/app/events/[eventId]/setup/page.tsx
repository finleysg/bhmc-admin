import { notFound } from "next/navigation"

import {
	RegistrationTypeChoices,
	type ClubEvent,
	type Course,
	type FeeType,
} from "@repo/domain/types"

import { Card, CardContent } from "@/components/shadcn/card"
import { apiGet } from "@/lib/server-api"

import { EventSettingsForm, type ExtraTab } from "../../components/event-settings-form"

import { updateEventSettings } from "./actions"
import { CoursesPanel } from "./components/courses-panel"
import { FeesPanel } from "./components/fees-panel"

/** The event workspace: every event setting, its courses, and its fees, as tabs. */
export default async function EventSetupPage({ params }: { params: Promise<{ eventId: string }> }) {
	const eventId = Number((await params).eventId)
	if (!Number.isInteger(eventId)) notFound()

	const [event, courses, feeTypes] = await Promise.all([
		apiGet<ClubEvent>(`/events/${eventId}/setup`),
		apiGet<Course[]>("/courses"),
		apiGet<FeeType[]>("/fee-types"),
	])

	// Shown from the saved settings: Courses when players choose a slot, Fees when the event has registration.
	const extraTabs: ExtraTab[] = []
	if (event.canChoose) {
		extraTabs.push({
			value: "courses",
			label: "Courses",
			content: <CoursesPanel eventId={eventId} courses={courses} selected={event.courses ?? []} />,
		})
	}
	if (event.registrationType !== RegistrationTypeChoices.NONE) {
		extraTabs.push({
			value: "fees",
			label: "Fees",
			content: <FeesPanel eventId={eventId} fees={event.eventFees ?? []} feeTypes={feeTypes} />,
		})
	}

	return (
		<div className="mx-auto max-w-4xl md:py-8">
			<Card>
				<CardContent>
					<EventSettingsForm
						event={event}
						action={updateEventSettings.bind(null, eventId)}
						submitLabel="Save settings"
						extraTabs={extraTabs}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
