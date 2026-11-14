/** Who made an administrative change, and from which client. */
export interface AuditContext {
	actorId: number
	client: "ui" | "cli"
}

/** Changed fields only: { field: { before, after } }. */
export type AuditChanges = Record<string, { before: unknown; after: unknown }>

export interface AuditEntryInput {
	/** Dotted name, e.g. "player.update", "player.roles.update". */
	operation: string
	entityType: string
	entityId: number
	eventId?: number | null
	/** Values before the change, for at least the fields in `after`. */
	before: Record<string, unknown>
	/** Values after the change. Only these fields are compared. */
	after: Record<string, unknown>
}
