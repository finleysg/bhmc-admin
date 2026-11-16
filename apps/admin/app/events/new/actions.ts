"use server"

import { redirect } from "next/navigation"

import type { ClubEvent, CreateEventInput } from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

import { parseEventSettings, type SettingsField } from "../event-settings"

/**
 * Creates the event, then opens it in the event workspace. A `copyFromEventId`
 * field (set by "Copy from event") copies that event's courses, fees, and
 * sessions into the new one.
 */
export async function createEvent(
	_prev: FormState<SettingsField>,
	formData: FormData,
): Promise<FormState<SettingsField>> {
	const parsed = parseEventSettings(formData)
	if (!parsed.ok) return parsed.state

	const copyFrom = Number(formData.get("copyFromEventId"))
	const body: CreateEventInput = {
		...parsed.data,
		...(Number.isInteger(copyFrom) && copyFrom > 0 ? { copyFromEventId: copyFrom } : {}),
	}
	const result = await apiRequest<ClubEvent>("/events", "POST", body)
	if (!result.ok) return { status: "error", message: result.message }

	redirect(`/events/${result.data.id}/setup`)
}

/** The events of a season, for choosing one to copy from. */
export async function listEventsForCopy(season: number): Promise<ClubEvent[]> {
	const result = await apiRequest<ClubEvent[]>(`/events?season=${season}`)
	if (!result.ok) return []
	return result.data.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** One event's settings with its courses, fees, and sessions, to copy into the new event form. */
export async function loadEventForCopy(eventId: number): Promise<ClubEvent | null> {
	const result = await apiRequest<ClubEvent>(`/events/${eventId}/setup`)
	return result.ok ? result.data : null
}
