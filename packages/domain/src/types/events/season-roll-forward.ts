import type { EventStatusValue, EventTypeValue } from "./choices"

/** One event of the source season and the event roll-forward would create from it. */
export interface RollForwardProposal {
	sourceEventId: number
	sourceName: string
	/** "YYYY-MM-DD" */
	sourceStartDate: string
	/** Canceled source events are proposed too: they were usually rained out. */
	sourceStatus: EventStatusValue
	eventType: EventTypeValue
	/** The new event's name: the source name with the source year moved to the target year. */
	name: string
	/** The new event's date, "YYYY-MM-DD": normally the source date + 364 days (same weekday). */
	startDate: string
	/** Players choose slots, so roll-forward creates the event's registration slots. */
	createsSlots: boolean
	/** Why the event cannot be created as proposed. Empty when it can. */
	issues: string[]
}

export interface RollForwardPreview {
	fromSeason: number
	toSeason: number
	events: RollForwardProposal[]
}

/** An event to create from a source event, with the name and date chosen in the preview. */
export interface RollForwardEventInput {
	sourceEventId: number
	name: string
	/** "YYYY-MM-DD". Signup, priority signup, and payments end keep their offsets from it. */
	startDate: string
}

/**
 * A roll-forward from one season to another. For a preview, `events` may be omitted to
 * propose every event of the source season.
 */
export interface RollForwardInput {
	fromSeason: number
	toSeason: number
	events?: RollForwardEventInput[]
}

export interface RollForwardCreatedEvent {
	sourceEventId: number
	eventId: number
	name: string
	startDate: string
	slotCount: number
}

export interface RollForwardResult {
	fromSeason: number
	toSeason: number
	created: RollForwardCreatedEvent[]
}
