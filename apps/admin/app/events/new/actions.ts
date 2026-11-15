"use server"

import { redirect } from "next/navigation"

import type { ClubEvent } from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

import { parseEventSettings, type SettingsField } from "../event-settings"

/** Creates the event, then opens it in the event workspace. */
export async function createEvent(
	_prev: FormState<SettingsField>,
	formData: FormData,
): Promise<FormState<SettingsField>> {
	const parsed = parseEventSettings(formData)
	if (!parsed.ok) return parsed.state

	const result = await apiRequest<ClubEvent>("/events", "POST", parsed.data)
	if (!result.ok) return { status: "error", message: result.message }

	redirect(`/events/${result.data.id}/setup`)
}
