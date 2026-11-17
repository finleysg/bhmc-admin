import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { registrationOpensAt } from "@repo/domain/functions"
import {
	EventStatusChoices,
	type EventReadiness,
	type EventTypeValue,
	type ReadinessLevel,
	type ReadinessSummary,
	RegistrationTypeChoices,
} from "@repo/domain/types"

import { AuditService, type AuditContext } from "../audit"
import { fromMysqlDatetime } from "../common"
import { DrizzleService, toDbString, type EventRow } from "../database"

import { type EventSnapshot, type ReadinessEvent, type ReadinessFee, runChecks } from "./checks"
import { ReadinessRepository, type Dismissal, type SeasonData } from "./readiness.repository"

const iso = (mysql: string | null) => (mysql ? fromMysqlDatetime(mysql) : null)

function toReadinessEvent(row: EventRow): ReadinessEvent {
	return {
		id: row.id,
		name: row.name,
		season: row.season,
		eventType: row.eventType as EventTypeValue,
		registrationType: row.registrationType,
		startType: row.startType,
		canChoose: Boolean(row.canChoose),
		status: row.status,
		startDate: row.startDate,
		startTime: row.startTime,
		prioritySignupStart: iso(row.prioritySignupStart),
		signupStart: iso(row.signupStart),
		signupEnd: iso(row.signupEnd),
		paymentsEnd: iso(row.paymentsEnd),
	}
}

/** Ready to Open Registration applies to an event with registration until it opens. */
function applies(e: ReadinessEvent, now: Date): boolean {
	if (e.registrationType === RegistrationTypeChoices.NONE) return false
	const opens = registrationOpensAt(e)
	return opens == null || Date.parse(opens) > now.getTime()
}

/** The same event last season: the same name, or the same name with the year moved back. */
function lastSeasonOf(row: EventRow, data: SeasonData): EventRow | undefined {
	const lastYearName = row.name.replaceAll(String(row.season), String(row.season - 1))
	return data.lastSeasonEvents.find((e) => e.name === row.name || e.name === lastYearName)
}

function snapshots(data: SeasonData): Map<number, EventSnapshot> {
	const feesOf = (eventId: number): ReadinessFee[] =>
		data.fees
			.filter((f) => f.eventId === eventId)
			.map((f) => ({
				feeTypeId: f.feeTypeId,
				feeTypeName: f.feeTypeName,
				amount: Number(f.amount),
			}))
	const sessionsOf = (eventId: number) =>
		data.sessions
			.filter((x) => x.eventId === eventId)
			.map(({ name, overrideCount }) => ({ name, overrideCount }))
	const events = data.events.map((row) => ({
		row,
		event: toReadinessEvent(row),
		fees: feesOf(row.id),
	}))

	return new Map(
		events.map(({ row, event, fees }) => {
			const last = lastSeasonOf(row, data)
			return [
				row.id,
				{
					event,
					fees,
					courseCount: data.courseCounts.get(row.id) ?? 0,
					slotCount: data.slotCounts.get(row.id) ?? 0,
					sessions: sessionsOf(row.id),
					lastSeasonSessions: last ? sessionsOf(last.id) : null,
					peers: events
						.filter(
							(p) =>
								p.row.id !== row.id &&
								p.row.eventType === row.eventType &&
								p.row.status !== EventStatusChoices.CANCELED,
						)
						.map((p) => ({ event: p.event, fees: p.fees })),
				},
			]
		}),
	)
}

function judge(snapshot: EventSnapshot, dismissals: Dismissal[], now: Date): EventReadiness {
	const { event } = snapshot
	if (!applies(event, now)) {
		return {
			eventId: event.id,
			milestone: "open-registration",
			applies: false,
			level: "green",
			findings: [],
		}
	}
	const findings = runChecks(snapshot).map((f) => ({
		...f,
		dismissed:
			f.severity === "warning" &&
			dismissals.some(
				(d) => d.eventId === event.id && d.code === f.code && d.subject === f.subject,
			),
	}))
	const level: ReadinessLevel = findings.some((f) => f.severity === "blocking")
		? "red"
		: findings.some((f) => !f.dismissed)
			? "yellow"
			: "green"
	return { eventId: event.id, milestone: "open-registration", applies: true, level, findings }
}

export function summarize(r: EventReadiness): ReadinessSummary {
	return {
		eventId: r.eventId,
		applies: r.applies,
		level: r.level,
		blocking: r.findings.filter((f) => f.severity === "blocking").length,
		warnings: r.findings.filter((f) => f.severity === "warning" && !f.dismissed).length,
	}
}

/** Ready to Open Registration: findings computed from the event's current setup. */
@Injectable()
export class ReadinessService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(ReadinessRepository) private readonly repository: ReadinessRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	async forSeason(season: number, now = new Date()): Promise<EventReadiness[]> {
		return (await this.forSeasonWithEvents(season, now)).map((x) => x.readiness)
	}

	/** Each event of the season with its readiness, for callers that also need the event. */
	async forSeasonWithEvents(
		season: number,
		now = new Date(),
	): Promise<{ event: ReadinessEvent; readiness: EventReadiness }[]> {
		const data = await this.repository.loadSeason(season)
		return [...snapshots(data).values()].map((s) => ({
			event: s.event,
			readiness: judge(s, data.dismissals, now),
		}))
	}

	async forEvent(eventId: number, now = new Date()): Promise<EventReadiness> {
		const season = await this.repository.findEventSeason(eventId)
		if (season === undefined) throw new NotFoundException(`Event ${eventId} not found`)
		const data = await this.repository.loadSeason(season)
		return judge(snapshots(data).get(eventId)!, data.dismissals, now)
	}

	/** Accepts a current warning for this event, and audits it. */
	async dismiss(
		eventId: number,
		code: string,
		subject: string,
		context: AuditContext,
	): Promise<EventReadiness> {
		const current = await this.forEvent(eventId)
		const finding = current.findings.find((f) => f.code === code && f.subject === subject)
		if (!finding || finding.severity !== "warning") {
			throw new BadRequestException("Only a current warning can be dismissed")
		}
		const d = { eventId, code, subject }
		await this.drizzle.db.transaction(async (tx) => {
			if (await this.repository.findDismissal(tx, d)) return
			const id = await this.repository.insertDismissal(
				tx,
				d,
				context.actorId,
				toDbString(new Date()),
			)
			await this.audit.record(tx, context, {
				operation: "readiness.dismiss",
				entityType: "readinessDismissal",
				entityId: id,
				eventId,
				before: { code: null, subject: null },
				after: { code, subject },
			})
		})
		return this.forEvent(eventId)
	}

	/** Brings a dismissed warning back, and audits it. */
	async restore(
		eventId: number,
		code: string,
		subject: string,
		context: AuditContext,
	): Promise<EventReadiness> {
		const d = { eventId, code, subject }
		await this.drizzle.db.transaction(async (tx) => {
			const row = await this.repository.findDismissal(tx, d)
			if (!row) throw new NotFoundException("That warning is not dismissed")
			await this.repository.deleteDismissal(tx, row.id)
			await this.audit.record(tx, context, {
				operation: "readiness.restore",
				entityType: "readinessDismissal",
				entityId: row.id,
				eventId,
				before: { code, subject },
				after: { code: null, subject: null },
			})
		})
		return this.forEvent(eventId)
	}
}
