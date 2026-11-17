import type { EventTypeValue } from "./choices"

/**
 * Changes one fee type from an old amount to a new one across a season (for example
 * Cart Fee $14 → $15), optionally only for one event type. Every amount of that fee
 * type equal to the old amount changes: event fee amounts, override amounts, and
 * session fees.
 */
export interface SeasonFeeChangeInput {
	season: number
	feeTypeId: number
	fromAmount: number
	toAmount: number
	/** Only events of this type; null or omitted for every event type. */
	eventType?: EventTypeValue | null
}

/** One amount that changes. */
export interface SeasonFeeChangeItem {
	/** The event fee's amount, its override amount, or a session's fee. */
	kind: "amount" | "override" | "session"
	eventFeeId: number
	/** For a session fee: the session's name. */
	sessionName?: string
}

/** An event with at least one amount equal to the old amount. */
export interface SeasonFeeChangeEvent {
	eventId: number
	eventName: string
	/** "YYYY-MM-DD" */
	startDate: string
	eventType: EventTypeValue
	changes: SeasonFeeChangeItem[]
	/** Why this event is left unchanged (registrations, or registration has opened); null if it changes. */
	refused: string | null
}

/** A previewed or applied fee change: the events it covers, changed unless refused. */
export interface SeasonFeeChange {
	season: number
	feeTypeId: number
	feeTypeName: string
	fromAmount: number
	toAmount: number
	eventType: EventTypeValue | null
	applied: boolean
	events: SeasonFeeChangeEvent[]
}
