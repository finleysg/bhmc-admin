import { and, count, eq, inArray, max } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import {
	course,
	DrizzleService,
	event,
	eventCourses,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	hole,
	registrationFee,
	registrationSlot,
	type CourseRow,
	type EventFeeInsert,
	type EventFeeRow,
	type EventInsert,
	type EventRow,
	type EventSessionFeeRow,
	type EventSessionRow,
	type FeeTypeRow,
} from "../../database"

type Db = MySql2Database

/** Writes for the event workspace. Every write takes the caller's transaction. */
@Injectable()
export class EventSetupRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	// lookups
	async listFeeTypes(): Promise<FeeTypeRow[]> {
		return this.drizzle.db.select().from(feeType).orderBy(feeType.name)
	}

	async listCourses(): Promise<CourseRow[]> {
		return this.drizzle.db.select().from(course).orderBy(course.name)
	}

	async feeTypeExists(tx: Db, feeTypeId: number): Promise<boolean> {
		const [row] = await tx.select({ id: feeType.id }).from(feeType).where(eq(feeType.id, feeTypeId))
		return row !== undefined
	}

	async findExistingCourseIds(tx: Db, courseIds: number[]): Promise<number[]> {
		if (courseIds.length === 0) return []
		const rows = await tx
			.select({ id: course.id })
			.from(course)
			.where(inArray(course.id, courseIds))
		return rows.map((r) => r.id)
	}

	// events_event
	/** The event under SELECT … FOR UPDATE, or undefined. */
	async lockEvent(tx: Db, eventId: number): Promise<EventRow | undefined> {
		const [row] = await tx.select().from(event).where(eq(event.id, eventId)).for("update")
		return row
	}

	async findEvent(tx: Db, eventId: number): Promise<EventRow> {
		const [row] = await tx.select().from(event).where(eq(event.id, eventId))
		if (!row) throw new Error(`No event found with id ${eventId}`)
		return row
	}

	async nameTaken(tx: Db, name: string, startDate: string, exceptId?: number): Promise<boolean> {
		const rows = await tx
			.select({ id: event.id })
			.from(event)
			.where(and(eq(event.name, name), eq(event.startDate, startDate)))
		return rows.some((r) => r.id !== exceptId)
	}

	async insertEvent(tx: Db, values: EventInsert): Promise<number> {
		const [result] = await tx.insert(event).values(values)
		return Number(result.insertId)
	}

	async updateEvent(tx: Db, eventId: number, values: Partial<EventInsert>): Promise<void> {
		await tx.update(event).set(values).where(eq(event.id, eventId))
	}

	// events_event_courses
	async findCourseIds(tx: Db, eventId: number): Promise<number[]> {
		const rows = await tx
			.select({ courseId: eventCourses.courseId })
			.from(eventCourses)
			.where(eq(eventCourses.eventId, eventId))
		return rows.map((r) => r.courseId).sort((a, b) => a - b)
	}

	async addCourses(tx: Db, eventId: number, courseIds: number[]): Promise<void> {
		if (courseIds.length === 0) return
		await tx.insert(eventCourses).values(courseIds.map((courseId) => ({ eventId, courseId })))
	}

	async removeCourses(tx: Db, eventId: number, courseIds: number[]): Promise<void> {
		if (courseIds.length === 0) return
		await tx
			.delete(eventCourses)
			.where(and(eq(eventCourses.eventId, eventId), inArray(eventCourses.courseId, courseIds)))
	}

	/** Registration slots of this event on holes of the given courses. */
	async countSlotsOnCourses(tx: Db, eventId: number, courseIds: number[]): Promise<number> {
		if (courseIds.length === 0) return 0
		const [row] = await tx
			.select({ count: count() })
			.from(registrationSlot)
			.innerJoin(hole, eq(hole.id, registrationSlot.holeId))
			.where(and(eq(registrationSlot.eventId, eventId), inArray(hole.courseId, courseIds)))
		return row.count
	}

	// events_eventfee
	async findFees(tx: Db, eventId: number): Promise<EventFeeRow[]> {
		return tx.select().from(eventFee).where(eq(eventFee.eventId, eventId))
	}

	async lockFee(tx: Db, eventId: number, feeId: number): Promise<EventFeeRow | undefined> {
		const [row] = await tx
			.select()
			.from(eventFee)
			.where(and(eq(eventFee.id, feeId), eq(eventFee.eventId, eventId)))
			.for("update")
		return row
	}

	async findFee(tx: Db, feeId: number): Promise<EventFeeRow> {
		const [row] = await tx.select().from(eventFee).where(eq(eventFee.id, feeId))
		if (!row) throw new Error(`No event fee found with id ${feeId}`)
		return row
	}

	async nextFeeDisplayOrder(tx: Db, eventId: number): Promise<number> {
		const [row] = await tx
			.select({ max: max(eventFee.displayOrder) })
			.from(eventFee)
			.where(eq(eventFee.eventId, eventId))
		return (row?.max ?? 0) + 1
	}

	async insertFee(tx: Db, values: EventFeeInsert): Promise<number> {
		const [result] = await tx.insert(eventFee).values(values)
		return Number(result.insertId)
	}

	async updateFee(tx: Db, feeId: number, values: Partial<EventFeeInsert>): Promise<void> {
		await tx.update(eventFee).set(values).where(eq(eventFee.id, feeId))
	}

	async deleteFee(tx: Db, feeId: number): Promise<void> {
		await tx.delete(eventFee).where(eq(eventFee.id, feeId))
	}

	async countRegistrationFees(tx: Db, feeId: number): Promise<number> {
		const [row] = await tx
			.select({ count: count() })
			.from(registrationFee)
			.where(eq(registrationFee.eventFeeId, feeId))
		return row.count
	}

	async countSessionFees(tx: Db, feeId: number): Promise<number> {
		const [row] = await tx
			.select({ count: count() })
			.from(eventSessionFee)
			.where(eq(eventSessionFee.eventFeeId, feeId))
		return row.count
	}

	// events_eventsession
	async findSessions(tx: Db, eventId: number): Promise<EventSessionRow[]> {
		return tx.select().from(eventSession).where(eq(eventSession.eventId, eventId))
	}

	async findSessionFees(tx: Db, sessionIds: number[]): Promise<EventSessionFeeRow[]> {
		if (sessionIds.length === 0) return []
		return tx.select().from(eventSessionFee).where(inArray(eventSessionFee.sessionId, sessionIds))
	}

	async insertSession(tx: Db, values: Omit<EventSessionRow, "id">): Promise<number> {
		const [result] = await tx.insert(eventSession).values(values)
		return Number(result.insertId)
	}

	async insertSessionFee(tx: Db, values: Omit<EventSessionFeeRow, "id">): Promise<void> {
		await tx.insert(eventSessionFee).values(values)
	}

	async lockSession(
		tx: Db,
		eventId: number,
		sessionId: number,
	): Promise<EventSessionRow | undefined> {
		const [row] = await tx
			.select()
			.from(eventSession)
			.where(and(eq(eventSession.id, sessionId), eq(eventSession.eventId, eventId)))
			.for("update")
		return row
	}

	async updateSession(
		tx: Db,
		sessionId: number,
		values: Pick<EventSessionRow, "name" | "registrationLimit" | "displayOrder">,
	): Promise<void> {
		await tx.update(eventSession).set(values).where(eq(eventSession.id, sessionId))
	}

	async deleteSession(tx: Db, sessionId: number): Promise<void> {
		await tx.delete(eventSessionFee).where(eq(eventSessionFee.sessionId, sessionId))
		await tx.delete(eventSession).where(eq(eventSession.id, sessionId))
	}

	/** Another session of the event already uses this name or display order. */
	async sessionConflict(
		tx: Db,
		eventId: number,
		values: { name: string; displayOrder: number },
		exceptId?: number,
	): Promise<"name" | "displayOrder" | undefined> {
		const others = (await this.findSessions(tx, eventId)).filter((s) => s.id !== exceptId)
		if (others.some((s) => s.name === values.name)) return "name"
		if (others.some((s) => s.displayOrder === values.displayOrder)) return "displayOrder"
		return undefined
	}

	async updateSessionFee(tx: Db, sessionFeeId: number, amount: string): Promise<void> {
		await tx.update(eventSessionFee).set({ amount }).where(eq(eventSessionFee.id, sessionFeeId))
	}

	async deleteSessionFees(tx: Db, sessionFeeIds: number[]): Promise<void> {
		if (sessionFeeIds.length === 0) return
		await tx.delete(eventSessionFee).where(inArray(eventSessionFee.id, sessionFeeIds))
	}

	async countSlotsInSession(tx: Db, sessionId: number): Promise<number> {
		const [row] = await tx
			.select({ count: count() })
			.from(registrationSlot)
			.where(eq(registrationSlot.sessionId, sessionId))
		return row.count
	}
}
