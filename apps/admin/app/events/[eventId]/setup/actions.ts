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
