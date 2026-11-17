/** A readiness milestone. Ready to Play arrives with pre-event preparation. */
export type ReadinessMilestone = "open-registration"

export type FindingSeverity = "blocking" | "warning"

/** Red: a blocking finding. Yellow: warnings not dismissed. Green: neither. */
export type ReadinessLevel = "red" | "yellow" | "green"

/** The workspace tab where a finding is fixed. */
export type ReadinessTab =
	"event" | "registration" | "dates" | "courses" | "slots" | "fees" | "sessions"

/** One readiness problem: what is wrong, why it matters, and how to fix it. */
export interface ReadinessFinding {
	code: string
	/** What the finding is about within the event (e.g. a fee type id); "" when there is one per event. */
	subject: string
	severity: FindingSeverity
	what: string
	why: string
	fix: string
	tab?: ReadinessTab
	/** Warnings only: whether an Event Admin has accepted it for this event. */
	dismissed: boolean
}

export interface EventReadiness {
	eventId: number
	milestone: ReadinessMilestone
	/** False once registration has opened, or for an event without registration. */
	applies: boolean
	level: ReadinessLevel
	findings: ReadinessFinding[]
}

/** One event's readiness without its findings, for the events list. */
export interface ReadinessSummary {
	eventId: number
	applies: boolean
	level: ReadinessLevel
	blocking: number
	/** Warnings not dismissed. */
	warnings: number
}
