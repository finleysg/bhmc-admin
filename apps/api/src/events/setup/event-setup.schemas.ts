import { BadRequestException } from "@nestjs/common"
import { dateOrderIssues, startTimeIssue } from "@repo/domain/functions"
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
		defaultTagId: z.number().int().positive().nullable(),
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
		for (const issue of dateOrderIssues(e)) fail(issue.field, issue.message)
		const startTime = startTimeIssue(e)
		if (startTime) fail("startTime", startTime)
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

/** Makes a change that registration having opened would otherwise refuse. */
export const overrideSchema = z.object({
	override: z.boolean().optional(),
})

/** On create: the event whose courses, fees, and sessions to copy into the new one. */
export const copyFromSchema = z.object({
	copyFromEventId: z.number().int().positive().optional(),
})

const season = z.number().int().min(2000).max(2100)
const rollForwardEvent = z.object({
	sourceEventId: z.number().int().positive(),
	name: z.string().trim().min(1).max(100),
	startDate: z.iso.date(),
})

/** A roll-forward preview: without `events`, every event of the source season is proposed. */
export const rollForwardPreviewSchema = z
	.object({ fromSeason: season, toSeason: season, events: z.array(rollForwardEvent).optional() })
	.refine((r) => r.fromSeason !== r.toSeason, {
		path: ["toSeason"],
		message: "Choose a target season other than the source season",
	})

export const rollForwardSchema = z
	.object({ fromSeason: season, toSeason: season, events: z.array(rollForwardEvent).min(1) })
	.refine((r) => r.fromSeason !== r.toSeason, {
		path: ["toSeason"],
		message: "Choose a target season other than the source season",
	})

export type RollForwardValues = z.infer<typeof rollForwardPreviewSchema>

export const seasonFeeChangeSchema = z
	.object({
		season,
		feeTypeId: z.number().int().positive(),
		fromAmount: money,
		toAmount: money,
		eventType: z.enum(EventTypeChoices).nullable().optional(),
	})
	.refine((f) => f.fromAmount !== f.toAmount, {
		path: ["toAmount"],
		message: "The new amount must differ from the old amount",
	})

export type SeasonFeeChangeValues = z.infer<typeof seasonFeeChangeSchema>

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
