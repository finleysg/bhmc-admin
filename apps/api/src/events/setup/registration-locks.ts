import { ConflictException } from "@nestjs/common"
import { registrationOpensAt } from "@repo/domain/functions"

import { fromMysqlDatetime } from "../../common"
import type { EventRow } from "../../database"

/** Whether registration has opened: at the priority signup start, or the signup start if none. */
export function registrationHasOpened(
	evt: Pick<EventRow, "prioritySignupStart" | "signupStart">,
	now = new Date(),
): boolean {
	const opens = registrationOpensAt(evt)
	return opens != null && Date.parse(fromMysqlDatetime(opens)) <= now.getTime()
}

/** Settings that define how registration works, which players signed up under. */
const REGISTRATION_RULES: Record<string, string> = {
	eventType: "event type",
	season: "season",
	registrationType: "registration type",
	canChoose: "whether players choose their slots",
	startType: "start type",
	groupSize: "group size",
	totalGroups: "groups per course",
	minimumSignupGroupSize: "minimum signup group size",
	maximumSignupGroupSize: "maximum signup group size",
	teamSize: "team size",
	ghinRequired: "GHIN required",
	ageRestriction: "age restriction",
	ageRestrictionType: "age restriction type",
}

/** Settings that move registered players' start times. */
const START_TIMES: Record<string, string> = {
	startDate: "event date",
	startTime: "start time",
	teeTimeSplits: "tee time splits",
	starterTimeInterval: "starter gap",
}

/**
 * The settings changes that need an override once registration has opened, as labels.
 * `before` and `after` are settings views (ISO datetimes). Signup end and payments end may
 * still move, as long as they stay in the future.
 */
export function lockedSettingChanges(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	now = new Date(),
): string[] {
	const changed = (field: string) => before[field] !== after[field]
	const labels = [...Object.entries(REGISTRATION_RULES), ...Object.entries(START_TIMES)]
		.filter(([field]) => changed(field))
		.map(([, label]) => label)
	if (changed("prioritySignupStart")) labels.push("priority signup start")
	if (changed("signupStart")) labels.push("signup start")
	for (const [field, label] of [
		["signupEnd", "signup end"],
		["paymentsEnd", "payments end"],
	]) {
		const value = after[field] as string | null
		if (changed(field) && (value == null || Date.parse(value) <= now.getTime())) {
			labels.push(`${label} (removed or moved into the past)`)
		}
	}
	return labels
}

/** The 409 for a locked change: the admin offers to save again with `override`. */
export function lockedChangeError(changes: string[]): ConflictException {
	return new ConflictException({
		statusCode: 409,
		error: "Conflict",
		message: `Registration has opened, so these changes affect players who may already be registered: ${changes.join(", ")}. Save again with the override to make them anyway.`,
		lockedChanges: changes,
		overridable: true,
	})
}
