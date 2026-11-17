import { notFound } from "next/navigation"

import { registrationOpensAt } from "@repo/domain/functions"

import {
	RegistrationTypeChoices,
	type ClubEvent,
	type ContentTag,
	type Course,
	type FeeType,
	type SlotGroup,
} from "@repo/domain/types"

import { Card, CardContent } from "@/components/shadcn/card"
import { apiGet } from "@/lib/server-api"

import { EventSettingsForm, type ExtraTab } from "../../components/event-settings-form"

import { updateEventSettings } from "./actions"
import { CoursesPanel } from "./components/courses-panel"
import { FeesPanel } from "./components/fees-panel"
import { SessionsPanel } from "./components/sessions-panel"
import { SlotsPanel } from "./components/slots-panel"

/** The event workspace: settings, courses, slots, fees, and sessions, as tabs. */
export default async function EventSetupPage({
	params,
	searchParams,
}: {
	params: Promise<{ eventId: string }>
	searchParams: Promise<{ tab?: string }>
}) {
	const eventId = Number((await params).eventId)
	const { tab } = await searchParams
	if (!Number.isInteger(eventId)) notFound()

	const [event, courses, feeTypes, tags] = await Promise.all([
		apiGet<ClubEvent>(`/events/${eventId}/setup`),
		apiGet<Course[]>("/courses"),
		apiGet<FeeType[]>("/fee-types"),
		apiGet<ContentTag[]>("/tags"),
	])
	const slotGroups = event.canChoose ? await apiGet<SlotGroup[]>(`/events/${eventId}/slots`) : []

	// Tabs follow the saved settings: players either choose a slot (Courses, Slots)
	// or register for a session (Sessions), and only events with registration have fees.
	const hasRegistration = event.registrationType !== RegistrationTypeChoices.NONE
	const opens = registrationOpensAt({
		prioritySignupStart: event.prioritySignupStart ?? null,
		signupStart: event.signupStart ?? null,
	})
	const registrationOpened = opens != null && Date.parse(opens) <= Date.now()
	const fees = event.eventFees ?? []
	const extraTabs: ExtraTab[] = []
	if (event.canChoose) {
		extraTabs.push(
			{
				value: "courses",
				label: "Courses",
				content: (
					<CoursesPanel eventId={eventId} courses={courses} selected={event.courses ?? []} />
				),
			},
			{
				value: "slots",
				label: "Slots",
				content: <SlotsPanel event={event} groups={slotGroups} />,
			},
		)
	}
	if (hasRegistration) {
		extraTabs.push({
			value: "fees",
			label: "Fees",
			content: (
				<FeesPanel
					eventId={eventId}
					fees={fees}
					feeTypes={feeTypes}
					registrationOpened={registrationOpened}
				/>
			),
		})
	}
	if (hasRegistration && !event.canChoose) {
		extraTabs.push({
			value: "sessions",
			label: "Sessions",
			content: <SessionsPanel eventId={eventId} sessions={event.sessions ?? []} fees={fees} />,
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
						tags={tags}
						initialTab={tab}
						registrationOpened={registrationOpened}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
