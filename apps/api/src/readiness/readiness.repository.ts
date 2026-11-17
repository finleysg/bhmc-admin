import { and, count, eq, inArray } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import {
	DrizzleService,
	event,
	eventCourses,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	readinessDismissal,
	registrationSlot,
	type EventRow,
} from "../database"

export interface SeasonFee {
	eventId: number
	feeTypeId: number
	feeTypeName: string
	amount: string
}

export interface SeasonSession {
	eventId: number
	name: string
	overrideCount: number
}

export interface Dismissal {
	eventId: number
	code: string
	subject: string
}

/** Everything readiness reads for one season, loaded in a fixed number of queries. */
export interface SeasonData {
	events: EventRow[]
	/** Last season's events, to find the sessions an event had then. */
	lastSeasonEvents: EventRow[]
	fees: SeasonFee[]
	courseCounts: Map<number, number>
	slotCounts: Map<number, number>
	/** Sessions of this season's and last season's events. */
	sessions: SeasonSession[]
	dismissals: Dismissal[]
}

type Db = MySql2Database

@Injectable()
export class ReadinessRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async findEventSeason(eventId: number): Promise<number | undefined> {
		const [row] = await this.drizzle.db
			.select({ season: event.season })
			.from(event)
			.where(eq(event.id, eventId))
		return row?.season
	}

	async loadSeason(season: number): Promise<SeasonData> {
		const db = this.drizzle.db
		const [events, lastSeasonEvents] = await Promise.all([
			db.select().from(event).where(eq(event.season, season)),
			db
				.select()
				.from(event)
				.where(eq(event.season, season - 1)),
		])
		const ids = events.map((e) => e.id)
		const sessionEventIds = [...ids, ...lastSeasonEvents.map((e) => e.id)]
		if (ids.length === 0) {
			return {
				events,
				lastSeasonEvents,
				fees: [],
				courseCounts: new Map(),
				slotCounts: new Map(),
				sessions: [],
				dismissals: [],
			}
		}

		const [fees, courses, slots, sessions, dismissals] = await Promise.all([
			db
				.select({
					eventId: eventFee.eventId,
					feeTypeId: eventFee.feeTypeId,
					feeTypeName: feeType.name,
					amount: eventFee.amount,
				})
				.from(eventFee)
				.innerJoin(feeType, eq(feeType.id, eventFee.feeTypeId))
				.where(inArray(eventFee.eventId, ids)),
			db
				.select({ eventId: eventCourses.eventId, n: count() })
				.from(eventCourses)
				.where(inArray(eventCourses.eventId, ids))
				.groupBy(eventCourses.eventId),
			db
				.select({ eventId: registrationSlot.eventId, n: count() })
				.from(registrationSlot)
				.where(inArray(registrationSlot.eventId, ids))
				.groupBy(registrationSlot.eventId),
			db
				.select({
					eventId: eventSession.eventId,
					name: eventSession.name,
					overrideCount: count(eventSessionFee.id),
				})
				.from(eventSession)
				.leftJoin(eventSessionFee, eq(eventSessionFee.sessionId, eventSession.id))
				.where(inArray(eventSession.eventId, sessionEventIds))
				.groupBy(eventSession.id, eventSession.eventId, eventSession.name),
			db
				.select({
					eventId: readinessDismissal.eventId,
					code: readinessDismissal.code,
					subject: readinessDismissal.subject,
				})
				.from(readinessDismissal)
				.where(inArray(readinessDismissal.eventId, ids)),
		])

		return {
			events,
			lastSeasonEvents,
			fees,
			courseCounts: new Map(courses.map((r) => [r.eventId, r.n])),
			slotCounts: new Map(slots.map((r) => [r.eventId, r.n])),
			sessions,
			dismissals,
		}
	}

	async findDismissal(tx: Db, d: Dismissal): Promise<{ id: number } | undefined> {
		const [row] = await tx
			.select({ id: readinessDismissal.id })
			.from(readinessDismissal)
			.where(
				and(
					eq(readinessDismissal.eventId, d.eventId),
					eq(readinessDismissal.code, d.code),
					eq(readinessDismissal.subject, d.subject),
				),
			)
			.for("update")
		return row
	}

	/** Inserts the dismissal and returns its id. */
	async insertDismissal(
		tx: Db,
		d: Dismissal,
		dismissedById: number,
		dismissedAt: string,
	): Promise<number> {
		const [result] = await tx
			.insert(readinessDismissal)
			.values({ ...d, dismissedById, dismissedAt })
		return Number(result.insertId)
	}

	async deleteDismissal(tx: Db, id: number): Promise<void> {
		await tx.delete(readinessDismissal).where(eq(readinessDismissal.id, id))
	}
}
