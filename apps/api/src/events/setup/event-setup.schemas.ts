import { BadRequestException } from "@nestjs/common"
import {
	AgeRestrictionTypeChoices,
	type EventSettingsInput,
	EventStatusChoices,
	EventTypeChoices,
	FeeRestrictionChoices,
	RegistrationTypeChoices,
	SkinTypeChoices,
	StartTypeChoices,
} from "@repo/domain/types"
import { z } from "zod"

const count = z.number().int().min(0)
const text = (max: number) => z.string().max(max).nullable()
const datetime = z.iso.datetime({ offset: true }).nullable()
const money = z.number().min(0).max(999.99).multipleOf(0.01)

/**
 * Event settings, with the rules Django's Event.clean() enforced on the
 * same fields so the two never disagree about what a valid event is.
 */
export const eventSettingsSchema = z
	.object({
		eventType: z.enum(EventTypeChoices),
		name: z.string().trim().min(1).max(100),
		rounds: count.nullable(),
		registrationType: z.enum(RegistrationTypeChoices),
		skinsType: z.enum(SkinTypeChoices).nullable(),
		minimumSignupGroupSize: count.nullable(),
		maximumSignupGroupSize: count.nullable(),
		groupSize: count.nullable(),
		totalGroups: count.nullable(),
		startType: z.enum(StartTypeChoices).nullable(),
		canChoose: z.boolean(),
		ghinRequired: z.boolean(),
		seasonPoints: count.nullable(),
		notes: z.string().nullable(),
		startDate: z.iso.date(),
		startTime: text(40),
		prioritySignupStart: datetime,
		signupStart: datetime,
		signupEnd: datetime,
		paymentsEnd: datetime,
		registrationMaximum: count.nullable(),
		portalUrl: text(240),
		externalUrl: text(255),
		status: z.enum(EventStatusChoices),
		season: z.number().int().min(2000).max(2100),
		teeTimeSplits: text(10),
		starterTimeInterval: count,
		teamSize: z.number().int().min(1),
		signupWaves: count.nullable(),
		ageRestriction: count.nullable(),
		ageRestrictionType: z.enum(AgeRestrictionTypeChoices),
	})
	.superRefine((e, ctx) => {
		const fail = (path: string, message: string) =>
			ctx.addIssue({ code: "custom", path: [path], message })
		const registers = e.registrationType !== RegistrationTypeChoices.NONE

		if (e.canChoose && !e.groupSize) {
			fail(
				"groupSize",
				"A group size is required when players choose their starting hole or tee time",
			)
		}
		if (e.canChoose && e.startType === StartTypeChoices.TEETIMES && !e.totalGroups) {
			fail(
				"totalGroups",
				"The number of groups per course is required when players choose their own tee times",
			)
		}
		if (registers && (!e.minimumSignupGroupSize || !e.maximumSignupGroupSize)) {
			fail(
				"minimumSignupGroupSize",
				"A minimum and maximum signup group size are required when an event includes registration",
			)
		}
		if (registers && (!e.signupStart || !e.signupEnd)) {
			fail(
				"signupStart",
				"Signup start and signup end are required when an event includes registration",
			)
		}
		if (e.signupStart && e.signupEnd && new Date(e.signupStart) > new Date(e.signupEnd)) {
			fail("signupEnd", "Signup start must be earlier than signup end")
		}
	})

export type EventSettings = z.infer<typeof eventSettingsSchema>

// The schema is the request contract for EventSettingsInput: fail to compile if they drift.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
true satisfies Same<EventSettings, EventSettingsInput>

export const eventFeeSchema = z
	.object({
		feeTypeId: z.number().int().positive(),
		amount: money,
		isRequired: z.boolean(),
		displayOrder: z.number().int().min(0).optional(),
		overrideAmount: money.nullable().optional(),
		overrideRestriction: z.enum(FeeRestrictionChoices).nullable().optional(),
	})
	.refine((f) => (f.overrideAmount == null) === (f.overrideRestriction == null), {
		path: ["overrideAmount"],
		message: "An override needs both an amount and a restriction",
	})

export type EventFeeValues = z.infer<typeof eventFeeSchema>

export const sessionSchema = z
	.object({
		name: z.string().trim().min(1).max(60),
		registrationLimit: z.number().int().min(1),
		displayOrder: z.number().int().min(1),
		feeOverrides: z.array(z.object({ eventFeeId: z.number().int().positive(), amount: money })),
	})
	.refine((s) => new Set(s.feeOverrides.map((f) => f.eventFeeId)).size === s.feeOverrides.length, {
		path: ["feeOverrides"],
		message: "A session can override each event fee only once",
	})

export type SessionValues = z.infer<typeof sessionSchema>

export const eventCoursesSchema = z.object({
	courseIds: z.array(z.number().int().positive()),
})

/** On create: the event whose courses, fees, and sessions to copy into the new one. */
export const copyFromSchema = z.object({
	copyFromEventId: z.number().int().positive().optional(),
})

/** Parses a request body, or throws a 400 listing every problem. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
	const result = schema.safeParse(body)
	if (!result.success) {
		throw new BadRequestException(
			result.error.issues.map((i) =>
				i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
			),
		)
	}
	return result.data
}
