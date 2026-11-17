"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import type {
	RollForwardEventInput,
	RollForwardInput,
	RollForwardPreview,
	RollForwardResult,
} from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

export interface RollForwardState extends FormState {
	/** Each event's issues, by source event id, for the names and dates as submitted. */
	issues?: Record<number, string[]>
}

const choiceSchema = z.object({
	sourceEventId: z.number().int().positive(),
	name: z.string().trim().min(1, "Enter a name"),
	startDate: z.iso.date("Enter a date"),
})

/**
 * Creates the checked events in the target season, then shows that season. If the API
 * refuses them, checks the submitted names and dates again to show each event's issues.
 */
export async function rollForward(
	fromSeason: number,
	toSeason: number,
	_prev: RollForwardState,
	formData: FormData,
): Promise<RollForwardState> {
	const ids = formData.getAll("include").map(Number)
	if (ids.length === 0) return { status: "error", message: "Choose at least one event" }

	const events: RollForwardEventInput[] = []
	const issues: Record<number, string[]> = {}
	for (const sourceEventId of ids) {
		const parsed = choiceSchema.safeParse({
			sourceEventId,
			name: formData.get(`name-${sourceEventId}`),
			startDate: formData.get(`date-${sourceEventId}`),
		})
		if (parsed.success) events.push(parsed.data)
		else issues[sourceEventId] = parsed.error.issues.map((i) => i.message)
	}
	if (Object.keys(issues).length > 0) {
		return { status: "error", message: "Some events need a name or date", issues }
	}

	const body: RollForwardInput = { fromSeason, toSeason, events }
	const result = await apiRequest<RollForwardResult>("/seasons/roll-forward", "POST", body)
	if (!result.ok) {
		if (result.status !== 409) return { status: "error", message: result.message }
		const check = await apiRequest<RollForwardPreview>(
			"/seasons/roll-forward/preview",
			"POST",
			body,
		)
		return {
			status: "error",
			message: "No events were created. Fix or uncheck the events with issues.",
			...(check.ok && {
				issues: Object.fromEntries(check.data.events.map((e) => [e.sourceEventId, e.issues])),
			}),
		}
	}

	redirect(`/events?season=${toSeason}`)
}
