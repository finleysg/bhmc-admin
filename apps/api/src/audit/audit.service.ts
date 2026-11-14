import type { MySql2Database } from "drizzle-orm/mysql2"

import { Injectable } from "@nestjs/common"

import { adminAuditEntry, toDbString } from "../database"

import type { AuditContext, AuditEntryInput } from "./audit.types"
import { diffChanges } from "./diff"

/**
 * Writes the admin audit record. Always called with the transaction that makes
 * the change, so the change and its entry commit or roll back together.
 */
@Injectable()
export class AuditService {
	/** Records the change. Returns false (and writes nothing) if no field changed. */
	async record(
		tx: MySql2Database,
		context: AuditContext,
		entry: AuditEntryInput,
	): Promise<boolean> {
		const changes = diffChanges(entry.before, entry.after)
		if (Object.keys(changes).length === 0) return false

		await tx.insert(adminAuditEntry).values({
			createdAt: toDbString(new Date()),
			actorId: context.actorId,
			client: context.client,
			operation: entry.operation,
			entityType: entry.entityType,
			entityId: entry.entityId,
			eventId: entry.eventId ?? null,
			changes,
		})
		return true
	}
}
