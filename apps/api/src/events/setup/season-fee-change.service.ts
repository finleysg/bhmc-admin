import { BadRequestException, Inject, Injectable } from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import type {
	EventTypeValue,
	SeasonFeeChange,
	SeasonFeeChangeEvent,
	SeasonFeeChangeItem,
} from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { DrizzleService, type EventFeeRow, type EventSessionFeeRow } from "../../database"

import { EventSetupRepository } from "./event-setup.repository"
import { parseBody, seasonFeeChangeSchema, type SeasonFeeChangeValues } from "./event-setup.schemas"
import { registrationHasOpened } from "./registration-locks"

type SessionFee = EventSessionFeeRow & { sessionName: string }

/** One event fee with an amount equal to the old amount. */
interface FeeMatch {
	fee: EventFeeRow
	amount: boolean
	override: boolean
	sessionFees: SessionFee[]
}

interface Plan {
	report: SeasonFeeChange
	/** Fee matches by event id. */
	matches: Map<number, FeeMatch[]>
}

const cents = (amount: string | number | null) =>
	amount == null ? null : Math.round(Number(amount) * 100)

/**
 * Season Fee Change: one fee type from an old amount to a new one across a season,
 * optionally for one event type, covering event fee amounts, override amounts, and
 * session fees. Events with registrations, or whose registration has opened, are left
 * unchanged; the rest change in one transaction.
 */
@Injectable()
export class SeasonFeeChangeService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventSetupRepository) private readonly repository: EventSetupRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	async preview(body: unknown): Promise<SeasonFeeChange> {
		const values = parseBody(seasonFeeChangeSchema, body)
		return (await this.plan(this.drizzle.db, values, false)).report
	}

	async apply(body: unknown, context: AuditContext): Promise<SeasonFeeChange> {
		const values = parseBody(seasonFeeChangeSchema, body)
		const to = values.toAmount.toFixed(2)
		return this.drizzle.db.transaction(async (tx) => {
			const { report, matches } = await this.plan(tx, values, true)
			for (const evt of report.events.filter((e) => e.refused === null)) {
				for (const m of matches.get(evt.eventId)!) {
					const before: Record<string, unknown> = {}
					const after: Record<string, unknown> = {}
					if (m.amount) {
						await this.repository.updateFee(tx, m.fee.id, { amount: to })
						before.amount = Number(m.fee.amount)
						after.amount = values.toAmount
					}
					if (m.override) {
						await this.repository.updateFee(tx, m.fee.id, { overrideAmount: to })
						before.overrideAmount = Number(m.fee.overrideAmount)
						after.overrideAmount = values.toAmount
					}
					if (m.sessionFees.length > 0) {
						for (const sf of m.sessionFees) {
							await this.repository.updateSessionFee(tx, sf.id, to)
						}
						before.sessionFees = sessionAmounts(m.sessionFees, (sf) => Number(sf.amount))
						after.sessionFees = sessionAmounts(m.sessionFees, () => values.toAmount)
					}
					await this.audit.record(tx, context, {
						operation: "event.fee.season-change",
						entityType: "event_fee",
						entityId: m.fee.id,
						eventId: evt.eventId,
						before,
						after,
					})
				}
			}
			return { ...report, applied: true }
		})
	}

	private async plan(
		db: MySql2Database,
		values: SeasonFeeChangeValues,
		lock: boolean,
	): Promise<Plan> {
		const eventType = values.eventType ?? null
		const from = cents(values.fromAmount)

		// With `lock`, the event locks come first and the reads that depend on them lock too:
		// under REPEATABLE READ a plain read before or after the lock wait would use a snapshot
		// from before another admin's change to these events committed.
		const rows = await this.repository.findSeasonFees(
			db,
			{ season: values.season, feeTypeId: values.feeTypeId, eventType },
			lock,
		)
		const feeType = await this.repository.findFeeType(db, values.feeTypeId)
		if (!feeType) throw new BadRequestException(`Unknown fee type ${values.feeTypeId}`)
		const sessionFees = await this.repository.findSessionFeesOf(
			db,
			rows.map((r) => r.fee.id),
			lock,
		)

		const matches = new Map<number, FeeMatch[]>()
		const events = new Map<number, (typeof rows)[number]["event"]>()
		for (const { event, fee } of rows) {
			const match: FeeMatch = {
				fee,
				amount: cents(fee.amount) === from,
				override: cents(fee.overrideAmount) === from,
				sessionFees: sessionFees.filter(
					(sf) => sf.eventFeeId === fee.id && cents(sf.amount) === from,
				),
			}
			if (!match.amount && !match.override && match.sessionFees.length === 0) continue
			matches.set(event.id, [...(matches.get(event.id) ?? []), match])
			events.set(event.id, event)
		}

		const registrations = await this.repository.countRegistrationsByEvent(
			db,
			[...events.keys()],
			lock,
		)
		const report: SeasonFeeChangeEvent[] = [...events.values()].map((event) => {
			const count = registrations.get(event.id) ?? 0
			const refused =
				count > 0
					? `Has ${count} registration${count === 1 ? "" : "s"}`
					: registrationHasOpened(event)
						? "Registration has opened"
						: null
			return {
				eventId: event.id,
				eventName: event.name,
				startDate: event.startDate,
				eventType: event.eventType as EventTypeValue,
				changes: matches.get(event.id)!.flatMap(itemsOf),
				refused,
			}
		})

		return {
			report: {
				season: values.season,
				feeTypeId: feeType.id,
				feeTypeName: feeType.name,
				fromAmount: values.fromAmount,
				toAmount: values.toAmount,
				eventType,
				applied: false,
				events: report,
			},
			matches,
		}
	}
}

/** Session name → amount, for the audit entry. */
function sessionAmounts(
	sessionFees: SessionFee[],
	amount: (sf: SessionFee) => number,
): Record<string, number> {
	return Object.fromEntries(sessionFees.map((sf) => [sf.sessionName, amount(sf)]))
}

function itemsOf(m: FeeMatch): SeasonFeeChangeItem[] {
	const eventFeeId = m.fee.id
	return [
		...(m.amount ? [{ kind: "amount" as const, eventFeeId }] : []),
		...(m.override ? [{ kind: "override" as const, eventFeeId }] : []),
		...m.sessionFees.map((sf) => ({
			kind: "session" as const,
			eventFeeId,
			sessionName: sf.sessionName,
		})),
	]
}
