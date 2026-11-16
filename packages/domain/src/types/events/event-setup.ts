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

/**
 * One group of registration slots: a tee time (tee-time events) or a hole and
 * wave (shotgun events, starting order 0 = A, 1 = B) on one course.
 */
export interface SlotGroup {
	courseId: number
	courseName: string
	holeId: number
	holeNumber: number
	startingOrder: number
	/** Counts of the group's slots by status code (A, P, R, X, U). */
	statusCounts: Record<string, number>
	/** Slots with a player in them, whatever their status. */
	filled: number
	total: number
	/** The group's slots in slot order, for showing it as a tee sheet row. */
	slots: SlotGroupSlot[]
}

export interface SlotGroupSlot {
	id: number
	slot: number
	/** Status code (A, P, R, X, U). */
	status: string
	playerName: string | null
}
