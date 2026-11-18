import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import {
	authUser,
	course,
	DrizzleService,
	event,
	eventFee,
	eventSession,
	eventSessionFee,
	feeType,
	hole,
	payment,
	player,
	refund,
	registration,
	registrationChangeLog,
	registrationFee,
	registrationSlot,
	type PaymentInsert,
	type RegistrationFeeInsert,
	type RegistrationSlotRow,
} from "../../database"

/** Reads and repairs for the Registration Inspector. */
@Injectable()
export class InspectorRepository {
	constructor(@Inject(DrizzleService) private readonly drizzle: DrizzleService) {}

	private get db() {
		return this.drizzle.db
	}

	// ==================== SEARCH ====================

	/**
	 * The event's registrations, newest first; with `text`, only those of the players
	 * matching it (name, email, or GHIN): a player on one of its slots, or the user who
	 * registered.
	 */
	async searchRegistrations(eventId: number, text: string) {
		const conditions = [eq(registration.eventId, eventId)]
		if (text) {
			const pattern = `%${text}%`
			const players = await this.db
				.select({ id: player.id, userId: player.userId })
				.from(player)
				.where(
					or(
						like(player.lastName, pattern),
						like(player.firstName, pattern),
						like(player.email, pattern),
						like(player.ghin, pattern),
						like(sql`CONCAT(${player.firstName}, ' ', ${player.lastName})`, pattern),
					),
				)
			if (players.length === 0) return []
			const playerIds = players.map((p) => p.id)
			const userIds = players.map((p) => p.userId).filter((id): id is number => id !== null)
			const onSlot = this.db
				.select({ id: registrationSlot.registrationId })
				.from(registrationSlot)
				.where(inArray(registrationSlot.playerId, playerIds))
			conditions.push(
				userIds.length
					? or(inArray(registration.id, onSlot), inArray(registration.userId, userIds))!
					: inArray(registration.id, onSlot),
			)
		}

		return this.db
			.select({
				registrationId: registration.id,
				signedUpBy: registration.signedUpBy,
				createdDate: registration.createdDate,
			})
			.from(registration)
			.where(and(...conditions))
			.orderBy(desc(registration.createdDate))
	}

	/** Player names on each registration's slots. */
	async findPlayerNamesByRegistration(registrationIds: number[]) {
		if (registrationIds.length === 0) return []
		return this.db
			.select({
				registrationId: registrationSlot.registrationId,
				firstName: player.firstName,
				lastName: player.lastName,
			})
			.from(registrationSlot)
			.innerJoin(player, eq(registrationSlot.playerId, player.id))
			.where(inArray(registrationSlot.registrationId, registrationIds))
			.orderBy(registrationSlot.slot)
	}

	// ==================== INSPECTION ====================

	async findRegistration(registrationId: number) {
		const [row] = await this.db
			.select({ registration, event, courseName: course.name })
			.from(registration)
			.innerJoin(event, eq(registration.eventId, event.id))
			.leftJoin(course, eq(registration.courseId, course.id))
			.where(eq(registration.id, registrationId))
			.limit(1)
		return row ?? null
	}

	async findSlots(registrationId: number) {
		return this.db
			.select({
				slot: registrationSlot,
				firstName: player.firstName,
				lastName: player.lastName,
				holeNumber: hole.holeNumber,
				sessionName: eventSession.name,
			})
			.from(registrationSlot)
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.leftJoin(eventSession, eq(registrationSlot.sessionId, eventSession.id))
			.where(eq(registrationSlot.registrationId, registrationId))
			.orderBy(registrationSlot.startingOrder, registrationSlot.slot)
	}

	async findFeesOfSlots(slotIds: number[]) {
		if (slotIds.length === 0) return []
		return this.db
			.select({ fee: registrationFee, feeTypeName: feeType.name })
			.from(registrationFee)
			.innerJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(inArray(registrationFee.registrationSlotId, slotIds))
			.orderBy(eventFee.displayOrder)
	}

	/** The given payments, plus any payment by `userId` for the event. */
	async findPayments(paymentIds: number[], eventId: number, userId: number | null) {
		const conditions = []
		if (paymentIds.length) conditions.push(inArray(payment.id, paymentIds))
		if (userId !== null) {
			conditions.push(and(eq(payment.eventId, eventId), eq(payment.userId, userId)))
		}
		if (conditions.length === 0) return []
		return this.db
			.select()
			.from(payment)
			.where(or(...conditions))
			.orderBy(payment.id)
	}

	async findRefunds(paymentIds: number[]) {
		if (paymentIds.length === 0) return []
		return this.db
			.select()
			.from(refund)
			.where(inArray(refund.paymentId, paymentIds))
			.orderBy(refund.id)
	}

	async findChangeLog(registrationId: number) {
		return this.db
			.select({
				entry: registrationChangeLog,
				actorFirstName: authUser.firstName,
				actorLastName: authUser.lastName,
			})
			.from(registrationChangeLog)
			.innerJoin(authUser, eq(registrationChangeLog.actorId, authUser.id))
			.where(eq(registrationChangeLog.registrationId, registrationId))
			.orderBy(desc(registrationChangeLog.createdDate))
	}

	async findEventFees(eventId: number) {
		return this.db
			.select({ fee: eventFee, feeTypeName: feeType.name })
			.from(eventFee)
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(eventFee.eventId, eventId))
			.orderBy(eventFee.displayOrder)
	}

	// ==================== REPAIRS ====================

	async lockSlot(tx: MySql2Database, slotId: number): Promise<RegistrationSlotRow | null> {
		const [row] = await tx
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
			.for("update")
		return row ?? null
	}

	async lockFeesOfSlot(tx: MySql2Database, slotId: number) {
		return tx
			.select()
			.from(registrationFee)
			.where(eq(registrationFee.registrationSlotId, slotId))
			.for("update")
	}

	/** A fee on a slot, with the slot's event; with `lock`, a locking read. */
	async findSlotFee(db: MySql2Database, feeId: number, lock: boolean) {
		const query = db
			.select({ fee: registrationFee, eventId: registrationSlot.eventId })
			.from(registrationFee)
			.innerJoin(registrationSlot, eq(registrationFee.registrationSlotId, registrationSlot.id))
			.where(eq(registrationFee.id, feeId))
			.limit(1)
		const [row] = lock ? await query.for("update") : await query
		return row ?? null
	}

	async updateSlot(
		tx: MySql2Database,
		slotId: number,
		values: Partial<Pick<RegistrationSlotRow, "status" | "playerId" | "registrationId">>,
	): Promise<void> {
		await tx.update(registrationSlot).set(values).where(eq(registrationSlot.id, slotId))
	}

	/** The payments of the slot's fees; with `lock`, a locking read. */
	async findPaymentsOfSlot(db: MySql2Database, slotId: number, lock: boolean) {
		const query = db
			.selectDistinct({ payment })
			.from(payment)
			.innerJoin(registrationFee, eq(registrationFee.paymentId, payment.id))
			.where(eq(registrationFee.registrationSlotId, slotId))
		const rows = lock ? await query.for("update") : await query
		return rows.map((r) => r.payment)
	}

	/** Locks the registration's slots and returns them. */
	async lockSlotsOfRegistration(tx: MySql2Database, registrationId: number) {
		return tx
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.registrationId, registrationId))
			.for("update")
	}

	async findRegistrationExpires(tx: MySql2Database, registrationId: number) {
		const [row] = await tx
			.select({ expires: registration.expires })
			.from(registration)
			.where(eq(registration.id, registrationId))
			.limit(1)
		return row?.expires ?? null
	}

	/** Detaches fees from their slot, keeping them on their payment (as a drop does). */
	async detachFees(tx: MySql2Database, feeIds: number[]): Promise<void> {
		if (feeIds.length === 0) return
		await tx
			.update(registrationFee)
			.set({ registrationSlotId: null })
			.where(inArray(registrationFee.id, feeIds))
	}

	async findEventFee(tx: MySql2Database, eventFeeId: number) {
		const [row] = await tx.select().from(eventFee).where(eq(eventFee.id, eventFeeId)).limit(1)
		return row ?? null
	}

	async findSessionFee(tx: MySql2Database, sessionId: number, eventFeeId: number) {
		const [row] = await tx
			.select()
			.from(eventSessionFee)
			.where(
				and(eq(eventSessionFee.sessionId, sessionId), eq(eventSessionFee.eventFeeId, eventFeeId)),
			)
			.limit(1)
		return row ?? null
	}

	async findPlayer(tx: MySql2Database, playerId: number) {
		const [row] = await tx.select().from(player).where(eq(player.id, playerId)).limit(1)
		return row ?? null
	}

	async findRegistrationUserId(tx: MySql2Database, registrationId: number) {
		const [row] = await tx
			.select({ userId: registration.userId })
			.from(registration)
			.where(eq(registration.id, registrationId))
			.limit(1)
		return row?.userId ?? null
	}

	async findEventStartDate(tx: MySql2Database, eventId: number) {
		const [row] = await tx
			.select({ startDate: event.startDate })
			.from(event)
			.where(eq(event.id, eventId))
			.limit(1)
		return row?.startDate ?? null
	}

	async findCanChoose(tx: MySql2Database, eventId: number) {
		const [row] = await tx
			.select({ canChoose: event.canChoose })
			.from(event)
			.where(eq(event.id, eventId))
			.limit(1)
		return Boolean(row?.canChoose)
	}

	async insertPayment(tx: MySql2Database, values: PaymentInsert): Promise<number> {
		const [result] = await tx.insert(payment).values(values)
		return Number(result.insertId)
	}

	async insertFee(tx: MySql2Database, values: RegistrationFeeInsert): Promise<number> {
		const [result] = await tx.insert(registrationFee).values(values)
		return Number(result.insertId)
	}

	async findPayment(tx: MySql2Database, paymentId: number) {
		const [row] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1)
		return row ?? null
	}
}
