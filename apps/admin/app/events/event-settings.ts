import { z } from "zod"

import { dateOrderIssues, startTimeIssue } from "@repo/domain/functions"
import {
	AgeRestrictionTypeChoices,
	EventStatusChoices,
	EventTypeChoices,
	RegistrationTypeChoices,
	SkinTypeChoices,
	StartTypeChoices,
	type EventSettingsInput,
} from "@repo/domain/types"

import { fromClubLocalInput } from "@/lib/club-time"
import type { FormState } from "@/lib/form-state"

/** Select value meaning "not set", since a Radix select item cannot have an empty value. */
export const NONE = "none"

const text = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `At most ${max} characters`)
		.transform((v) => v || null)

const wholeNumber = z.number({ error: "Enter a whole number" }).int("Enter a whole number")

/** Blank becomes null. */
const optionalCount = z
	.string()
	.trim()
	.transform((v) => (v === "" ? null : Number(v)))
	.pipe(wholeNumber.min(0, "Cannot be negative").nullable())

const requiredCount = (min: number) =>
	z
		.string()
		.trim()
		.min(1, "Required")
		.transform(Number)
		.pipe(wholeNumber.min(min, `At least ${min}`))

const choice = <T extends Record<string, string>>(choices: T) => z.enum(choices)
const optionalChoice = <T extends Record<string, string>>(choices: T) =>
	z
		.string()
		.transform((v) => (v === NONE || v === "" ? null : v))
		.pipe(z.enum(choices).nullable())

const datetime = z.string().transform((v, ctx) => {
	if (!v) return null
	const iso = fromClubLocalInput(v)
	if (!iso) ctx.addIssue({ code: "custom", message: "Enter a date and time" })
	return iso
})

const settingsSchema = z
	.object({
		eventType: choice(EventTypeChoices),
		name: z.string().trim().min(1, "Name is required").max(100, "At most 100 characters"),
		rounds: optionalCount,
		registrationType: choice(RegistrationTypeChoices),
		skinsType: optionalChoice(SkinTypeChoices),
		minimumSignupGroupSize: optionalCount,
		maximumSignupGroupSize: optionalCount,
		groupSize: optionalCount,
		totalGroups: optionalCount,
		startType: optionalChoice(StartTypeChoices),
		canChoose: z.boolean(),
		ghinRequired: z.boolean(),
		seasonPoints: optionalCount,
		notes: z
			.string()
			.trim()
			.transform((v) => v || null),
		startDate: z.iso.date("Enter a date"),
		startTime: text(40),
		prioritySignupStart: datetime,
		signupStart: datetime,
		signupEnd: datetime,
		paymentsEnd: datetime,
		registrationMaximum: optionalCount,
		portalUrl: text(240),
		externalUrl: text(255),
		status: choice(EventStatusChoices),
		season: requiredCount(2000),
		teeTimeSplits: text(10),
		starterTimeInterval: requiredCount(0),
		teamSize: requiredCount(1),
		signupWaves: optionalCount,
		ageRestriction: optionalCount,
		ageRestrictionType: choice(AgeRestrictionTypeChoices),
		defaultTagId: z
			.string()
			.transform((v) => (v === NONE || v === "" ? null : Number(v)))
			.pipe(wholeNumber.positive("Choose a tag").nullable()),
	})
	// Date order and the tee sheet's start time are checked here too, so the field is
	// highlighted before the API refuses it.
	.superRefine((e, ctx) => {
		for (const issue of dateOrderIssues(e)) {
			ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message })
		}
		const startTime = startTimeIssue(e)
		if (startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: startTime })
	}) satisfies z.ZodType<EventSettingsInput>

export type SettingsField = keyof EventSettingsInput

const CHECKBOXES = new Set<string>(["canChoose", "ghinRequired"])

const textValue = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "")

/**
 * Reads the event settings form. Checks the shape of each field, the order of the
 * dates, and the tee sheet's start time; the API enforces the other rules between fields and reports them as
 * the form's message.
 */
export function parseEventSettings(
	formData: FormData,
): { ok: true; data: EventSettingsInput } | { ok: false; state: FormState<SettingsField> } {
	const raw = Object.fromEntries(
		Object.keys(settingsSchema.shape).map((key) => [
			key,
			CHECKBOXES.has(key) ? formData.get(key) === "on" : textValue(formData.get(key)),
		]),
	)
	const parsed = settingsSchema.safeParse(raw)
	if (parsed.success) return { ok: true, data: parsed.data }

	const fieldErrors: Partial<Record<SettingsField, string>> = {}
	for (const issue of parsed.error.issues) {
		fieldErrors[issue.path[0] as SettingsField] ??= issue.message
	}
	return {
		ok: false,
		state: { status: "error", message: "Please fix the highlighted fields.", fieldErrors },
	}
}
