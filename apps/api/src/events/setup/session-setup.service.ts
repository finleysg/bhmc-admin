import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import type { EventSessionWithFees } from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { DrizzleService, type EventSessionFeeRow, type EventSessionRow } from "../../database"
import { toEventSessionWithFees } from "../mappers"

import { EventSetupRepository } from "./event-setup.repository"
import { parseBody, sessionSchema, type SessionValues } from "./event-setup.schemas"

/**
 * Event sessions and their fee overrides. Each change runs in one transaction
 * with its audit entry; fee overrides are updated in place, never deleted and
 * recreated.
 */
@Injectable()
export class SessionSetupService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventSetupRepository) private readonly repository: EventSetupRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	async createSession(
		eventId: number,
		body: unknown,
		context: AuditContext,
	): Promise<EventSessionWithFees> {
		const values = parseBody(sessionSchema, body)
		return this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			await this.check(tx, eventId, values)
			const { feeOverrides, ...session } = values
			const sessionId = await this.repository.insertSession(tx, { eventId, ...session })
			for (const fo of feeOverrides) {
				await this.repository.insertSessionFee(tx, {
					sessionId,
					eventFeeId: fo.eventFeeId,
					amount: fo.amount.toFixed(2),
				})
			}
			const after = await this.read(tx, eventId, sessionId)
			await this.audit.record(tx, context, {
				operation: "event.session.create",
				entityType: "event_session",
				entityId: sessionId,
				eventId,
				before: {},
				after: auditView(after),
			})
			return after
		})
	}

	async updateSession(
		eventId: number,
		sessionId: number,
		body: unknown,
		context: AuditContext,
	): Promise<EventSessionWithFees> {
		const values = parseBody(sessionSchema, body)
		return this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			await this.lockSession(tx, eventId, sessionId)
			const before = await this.read(tx, eventId, sessionId)
			await this.check(tx, eventId, values, sessionId)

			const { feeOverrides, ...session } = values
			await this.repository.updateSession(tx, sessionId, session)

			const existing = new Map(
				(await this.repository.findSessionFees(tx, [sessionId])).map((f) => [f.eventFeeId, f]),
			)
			for (const fo of feeOverrides) {
				const amount = fo.amount.toFixed(2)
				const current = existing.get(fo.eventFeeId)
				if (!current) {
					await this.repository.insertSessionFee(tx, {
						sessionId,
						eventFeeId: fo.eventFeeId,
						amount,
					})
				} else if (current.amount !== amount) {
					await this.repository.updateSessionFee(tx, current.id, amount)
				}
				existing.delete(fo.eventFeeId)
			}
			await this.repository.deleteSessionFees(
				tx,
				[...existing.values()].map((f) => f.id),
			)

			const after = await this.read(tx, eventId, sessionId)
			await this.audit.record(tx, context, {
				operation: "event.session.update",
				entityType: "event_session",
				entityId: sessionId,
				eventId,
				before: auditView(before),
				after: auditView(after),
			})
			return after
		})
	}

	/** Refused once any registration slot belongs to the session. */
	async deleteSession(eventId: number, sessionId: number, context: AuditContext): Promise<void> {
		await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			const session = await this.lockSession(tx, eventId, sessionId)
			const slots = await this.repository.countSlotsInSession(tx, sessionId)
			if (slots > 0) {
				throw new ConflictException(
					`Cannot delete session "${session.name}": ${slots} registration slot(s) belong to it`,
				)
			}
			const before = auditView(await this.read(tx, eventId, sessionId))
			await this.repository.deleteSession(tx, sessionId)
			await this.audit.record(tx, context, {
				operation: "event.session.delete",
				entityType: "event_session",
				entityId: sessionId,
				eventId,
				before,
				after: Object.fromEntries(Object.keys(before).map((k) => [k, null])),
			})
		})
	}

	private async check(
		tx: MySql2Database,
		eventId: number,
		values: SessionValues,
		exceptId?: number,
	): Promise<void> {
		const conflict = await this.repository.sessionConflict(tx, eventId, values, exceptId)
		if (conflict === "name") {
			throw new ConflictException(`The event already has a session named "${values.name}"`)
		}
		if (conflict === "displayOrder") {
			throw new ConflictException(
				`Another session of the event already has display order ${values.displayOrder}`,
			)
		}
		const feeIds = new Set((await this.repository.findFees(tx, eventId)).map((f) => f.id))
		const foreign = values.feeOverrides.filter((f) => !feeIds.has(f.eventFeeId))
		if (foreign.length > 0) {
			throw new BadRequestException(
				`Event fee(s) ${foreign.map((f) => f.eventFeeId).join(", ")} do not belong to this event`,
			)
		}
	}

	private async read(
		tx: MySql2Database,
		eventId: number,
		sessionId: number,
	): Promise<EventSessionWithFees> {
		const session = (await this.repository.findSessions(tx, eventId)).find(
			(s) => s.id === sessionId,
		)!
		const fees: EventSessionFeeRow[] = await this.repository.findSessionFees(tx, [sessionId])
		return toEventSessionWithFees(session, fees)
	}

	private async lockEvent(tx: MySql2Database, eventId: number): Promise<void> {
		if (!(await this.repository.lockEvent(tx, eventId))) {
			throw new NotFoundException(`Event ${eventId} not found`)
		}
	}

	private async lockSession(
		tx: MySql2Database,
		eventId: number,
		sessionId: number,
	): Promise<EventSessionRow> {
		const row = await this.repository.lockSession(tx, eventId, sessionId)
		if (!row) throw new NotFoundException(`Session ${sessionId} not found on event ${eventId}`)
		return row
	}
}

function auditView(s: EventSessionWithFees): Record<string, unknown> {
	return {
		name: s.name,
		registrationLimit: s.registrationLimit,
		displayOrder: s.displayOrder,
		feeOverrides: s.feeOverrides
			.map((f) => ({ eventFeeId: f.eventFeeId, amount: f.amount }))
			.sort((a, b) => a.eventFeeId - b.eventFeeId),
	}
}
