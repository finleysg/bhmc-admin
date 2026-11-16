import { and, asc, count, eq, inArray, max } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import {
	course,
	DrizzleService,
	hole,
	player,
	registrationSlot,
	type RegistrationSlotRow,
} from "../../database"

type Db = MySql2Database
export type NewSlot = Pick<
	RegistrationSlotRow,
	"eventId" | "holeId" | "startingOrder" | "slot" | "status"
>

/** Registration slot writes for the event workspace. Every write takes the caller's transaction. */
@Injectable()
export class SlotSetupRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	/** Every slot of the event with its hole, course, and player, in course, order, hole, slot order. */
	async listSlots(eventId: number) {
		return this.drizzle.db
			.select({
				id: registrationSlot.id,
				slot: registrationSlot.slot,
				status: registrationSlot.status,
				playerId: registrationSlot.playerId,
				firstName: player.firstName,
				lastName: player.lastName,
				startingOrder: registrationSlot.startingOrder,
				holeId: hole.id,
				holeNumber: hole.holeNumber,
				courseId: course.id,
				courseName: course.name,
			})
			.from(registrationSlot)
			.innerJoin(hole, eq(hole.id, registrationSlot.holeId))
			.innerJoin(course, eq(course.id, hole.courseId))
			.leftJoin(player, eq(player.id, registrationSlot.playerId))
			.where(eq(registrationSlot.eventId, eventId))
			.orderBy(
				asc(course.name),
				asc(registrationSlot.startingOrder),
				asc(hole.holeNumber),
				asc(registrationSlot.slot),
			)
	}

	async findHoles(tx: Db, courseIds: number[]) {
		if (courseIds.length === 0) return []
		return tx
			.select({ id: hole.id, courseId: hole.courseId, holeNumber: hole.holeNumber })
			.from(hole)
			.where(inArray(hole.courseId, courseIds))
			.orderBy(asc(hole.courseId), asc(hole.holeNumber))
	}

	async countSlots(tx: Db, eventId: number): Promise<number> {
		const [row] = await tx
			.select({ count: count() })
			.from(registrationSlot)
			.where(eq(registrationSlot.eventId, eventId))
		return row.count
	}

	async maxStartingOrder(tx: Db, eventId: number): Promise<number | null> {
		const [row] = await tx
			.select({ max: max(registrationSlot.startingOrder) })
			.from(registrationSlot)
			.where(eq(registrationSlot.eventId, eventId))
		return row?.max ?? null
	}

	async insertSlots(tx: Db, slots: NewSlot[]): Promise<void> {
		if (slots.length === 0) return
		await tx.insert(registrationSlot).values(slots)
	}

	/** The slots of one group (hole + starting order) under SELECT … FOR UPDATE. */
	async lockGroup(
		tx: Db,
		eventId: number,
		holeId: number,
		startingOrder: number,
	): Promise<RegistrationSlotRow[]> {
		return tx
			.select()
			.from(registrationSlot)
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					eq(registrationSlot.holeId, holeId),
					eq(registrationSlot.startingOrder, startingOrder),
				),
			)
			.orderBy(asc(registrationSlot.slot))
			.for("update")
	}

	async deleteSlots(tx: Db, ids: number[]): Promise<void> {
		if (ids.length === 0) return
		await tx.delete(registrationSlot).where(inArray(registrationSlot.id, ids))
	}

	async setStatus(tx: Db, ids: number[], status: string): Promise<void> {
		if (ids.length === 0) return
		await tx.update(registrationSlot).set({ status }).where(inArray(registrationSlot.id, ids))
	}
}
