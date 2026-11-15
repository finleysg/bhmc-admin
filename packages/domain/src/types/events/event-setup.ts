import type { ClubEvent } from "./event"
import type { FeeRestrictionValue } from "./choices"

/**
 * The event settings an Event Admin edits in the event workspace: every event
 * field except the Golf Genius id, which only Event Sync sets.
 * Datetimes are ISO 8601 strings with an offset or "Z". Every field is
 * required (null where unset): create and update both take the full settings.
 */
export type EventSettingsInput = Required<
	Omit<
		ClubEvent,
		"id" | "ggId" | "courses" | "eventFees" | "sessions" | "eventRounds" | "tournaments"
	>
>

/** An event fee as the event workspace creates or edits it. */
export interface EventFeeInput {
	feeTypeId: number
	amount: number
	isRequired: boolean
	/** Omit on create to place the fee last. */
	displayOrder?: number
	overrideAmount?: number | null
	overrideRestriction?: FeeRestrictionValue | null
}

/** Copy an event to a new date. Dates relative to the event date keep their offsets. */
export interface CopyEventInput {
	startDate: string
	/** Defaults to the source event's name. */
	name?: string
}
