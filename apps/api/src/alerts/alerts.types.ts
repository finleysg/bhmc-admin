import type { AdminRole } from "@repo/domain/types"

/** Who should hear about a finding: everyone holding a role, or a specific address. */
export type AlertRecipient = { role: AdminRole } | { email: string }

/** One thing that needs attention, stated so the reader can act on it. */
export interface AlertFinding {
	/** The source's name, used to group findings in the digest. */
	source: string
	/** What is wrong. */
	title: string
	/** Why it matters and how to fix it. */
	detail: string
	/** Where to fix it, as an absolute URL. */
	link?: string
	recipients: AlertRecipient[]
}

/**
 * Produces the findings for one kind of alert (e.g. readiness). Sources are
 * registered under ALERT_SOURCES; the daily job asks each for today's findings.
 */
export interface AlertSource {
	name: string
	findings(today: Date): Promise<AlertFinding[]>
}

export const ALERT_SOURCES = Symbol("ALERT_SOURCES")

/** Everything one recipient will receive in today's email. */
export interface AlertDigest {
	email: string
	findings: Omit<AlertFinding, "recipients">[]
}
