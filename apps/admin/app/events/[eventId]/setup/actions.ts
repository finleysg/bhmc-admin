"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { FeeRestrictionChoices, type EventFeeInput } from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

import { NONE, parseEventSettings, type SettingsField } from "../../event-settings"

function refresh(eventId: number) {
	// The layout shows the event's name and date, so refresh it too.
	revalidatePath(`/events/${eventId}`, "layout")
}

export async function updateEventSettings(
	eventId: number,
	_prev: FormState<SettingsField>,
	formData: FormData,
): Promise<FormState<SettingsField>> {
	const parsed = parseEventSettings(formData)
	if (!parsed.ok) return parsed.state

	const result = await apiRequest(`/events/${eventId}`, "PUT", parsed.data)
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: "Event settings saved" }
}

export async function setEventCourses(
	eventId: number,
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const courseIds = formData.getAll("courseIds").map(Number)
	if (courseIds.some((id) => !Number.isInteger(id))) {
		return { status: "error", message: "Unknown course" }
	}

	const result = await apiRequest(`/events/${eventId}/courses`, "PUT", { courseIds })
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: "Courses saved" }
}

const money = z.number({ error: "Enter an amount" }).min(0, "Cannot be negative")
const blankToNull = z
	.string()
	.trim()
	.transform((v) => (v === "" ? null : Number(v)))

const feeSchema = z
	.object({
		feeTypeId: z.coerce.number({ error: "Choose a fee type" }).int().positive("Choose a fee type"),
		amount: blankToNull.pipe(money),
		isRequired: z.boolean(),
		overrideAmount: blankToNull.pipe(money.nullable()),
		overrideRestriction: z
			.string()
			.transform((v) => (v === NONE || v === "" ? null : v))
			.pipe(z.enum(FeeRestrictionChoices).nullable()),
	})
	.refine((f) => (f.overrideAmount === null) === (f.overrideRestriction === null), {
		path: ["overrideAmount"],
		message: "An override needs both an amount and a restriction",
	}) satisfies z.ZodType<Omit<EventFeeInput, "displayOrder">>

export type FeeField = "feeTypeId" | "amount" | "overrideAmount" | "overrideRestriction"

/** Adds a fee (feeId null) or saves an existing one. */
export async function saveEventFee(
	eventId: number,
	feeId: number | null,
	_prev: FormState<FeeField>,
	formData: FormData,
): Promise<FormState<FeeField>> {
	const parsed = feeSchema.safeParse({
		feeTypeId: formData.get("feeTypeId") ?? "",
		amount: formData.get("amount") ?? "",
		isRequired: formData.get("isRequired") === "on",
		overrideAmount: formData.get("overrideAmount") ?? "",
		overrideRestriction: formData.get("overrideRestriction") ?? "",
	})
	if (!parsed.success) {
		const fieldErrors: Partial<Record<FeeField, string>> = {}
		for (const issue of parsed.error.issues) {
			fieldErrors[issue.path[0] as FeeField] ??= issue.message
		}
		return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
	}

	const result =
		feeId === null
			? await apiRequest(`/events/${eventId}/fees`, "POST", parsed.data)
			: await apiRequest(`/events/${eventId}/fees/${feeId}`, "PUT", parsed.data)
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: feeId === null ? "Fee added" : "Fee saved" }
}

export async function deleteEventFee(eventId: number, feeId: number): Promise<FormState> {
	const result = await apiRequest(`/events/${eventId}/fees/${feeId}`, "DELETE")
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: "Fee deleted" }
}

const sessionSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(60, "At most 60 characters"),
	registrationLimit: z.coerce
		.number({ error: "Enter a whole number" })
		.int("Enter a whole number")
		.min(1, "At least 1"),
	displayOrder: z.coerce
		.number({ error: "Enter a whole number" })
		.int("Enter a whole number")
		.min(1, "At least 1"),
	feeOverrides: z.array(
		z.object({
			eventFeeId: z.number().int().positive(),
			amount: z.number({ error: "Enter an amount" }).min(0, "Cannot be negative"),
		}),
	),
})

export type SessionField = "name" | "registrationLimit" | "displayOrder" | "feeOverrides"

/**
 * Adds a session (sessionId null) or saves an existing one. Each event fee's
 * override comes from an `override-<eventFeeId>` field; blank means no override.
 */
export async function saveSession(
	eventId: number,
	sessionId: number | null,
	_prev: FormState<SessionField>,
	formData: FormData,
): Promise<FormState<SessionField>> {
	const feeOverrides: { eventFeeId: number; amount: number }[] = []
	for (const [key, value] of formData.entries()) {
		if (!key.startsWith("override-") || typeof value !== "string" || value.trim() === "") continue
		feeOverrides.push({ eventFeeId: Number(key.slice("override-".length)), amount: Number(value) })
	}
	const parsed = sessionSchema.safeParse({
		name: formData.get("name") ?? "",
		registrationLimit: formData.get("registrationLimit") || undefined,
		displayOrder: formData.get("displayOrder") || undefined,
		feeOverrides,
	})
	if (!parsed.success) {
		const fieldErrors: Partial<Record<SessionField, string>> = {}
		for (const issue of parsed.error.issues) {
			fieldErrors[issue.path[0] as SessionField] ??= issue.message
		}
		return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
	}

	const result =
		sessionId === null
			? await apiRequest(`/events/${eventId}/sessions`, "POST", parsed.data)
			: await apiRequest(`/events/${eventId}/sessions/${sessionId}`, "PUT", parsed.data)
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: sessionId === null ? "Session added" : "Session saved" }
}

export async function deleteSession(eventId: number, sessionId: number): Promise<FormState> {
	const result = await apiRequest(`/events/${eventId}/sessions/${sessionId}`, "DELETE")
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: "Session deleted" }
}

async function slotRequest(
	eventId: number,
	path: string,
	method: "POST" | "PUT" | "DELETE",
	success: string,
	body?: unknown,
): Promise<FormState> {
	const result = await apiRequest(`/events/${eventId}/slots${path}`, method, body)
	if (!result.ok) return { status: "error", message: result.message }

	refresh(eventId)
	return { status: "success", message: success }
}

export async function createSlots(eventId: number): Promise<FormState> {
	return slotRequest(eventId, "", "POST", "Slots created")
}

export async function appendTeeTime(eventId: number): Promise<FormState> {
	return slotRequest(eventId, "/tee-times", "POST", "Tee time added")
}

export async function deleteSlotGroup(
	eventId: number,
	holeId: number,
	startingOrder: number,
): Promise<FormState> {
	return slotRequest(eventId, `/groups/${holeId}/${startingOrder}`, "DELETE", "Group deleted")
}

export async function setSlotGroupStatus(
	eventId: number,
	holeId: number,
	startingOrder: number,
	status: "A" | "U",
): Promise<FormState> {
	return slotRequest(
		eventId,
		`/groups/${holeId}/${startingOrder}/status`,
		"PUT",
		status === "U" ? "Group disabled" : "Group enabled",
		{ status },
	)
}
