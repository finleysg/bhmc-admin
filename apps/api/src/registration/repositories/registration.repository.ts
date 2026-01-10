import { and, eq, inArray, or, like, lt, sql } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Injectable, Logger } from "@nestjs/common"

import {
	course,
	DrizzleService,
	eventFee,
	feeType,
	hole,
	payment,
	player,
	registration,
	registrationFee,
	registrationSlot,
	type CourseRow,
	type HoleRow,
	type PlayerRow,
	type RegistrationFeeInsert,
	type RegistrationFeeRow,
	type RegistrationInsert,
	type RegistrationRow,
	type RegistrationSlotRow,
	type RegistrationSlotInsert,
	type PlayerInsert,
	toDbString,
	RegistrationFull,
	RegistrationSlotFull,
	RegistrationWithSlots,
	RegistrationSlotWithHole,
	CompleteRegistrationRow,
	CompleteRegistrationSlotRow,
} from "../../database"
import { type FeeWithEventFeeRow, type SlotWithPlayerAndHoleRow } from "../mappers"
import { RegistrationStatusValue } from "@repo/domain/types"

@Injectable()
export class RegistrationRepository {
	private readonly logger = new Logger(RegistrationRepository.name)

	constructor(private drizzle: DrizzleService) {}

	// ==================== PLAYER ====================

	async findPlayerById(id: number): Promise<PlayerRow> {
		const [p] = await this.drizzle.db.select().from(player).where(eq(player.id, id)).limit(1)
		if (!p) {
			throw new Error(`No player found with id ${id}`)
		}
		return p
	}

	async findPlayersByIds(ids: number[]): Promise<PlayerRow[]> {
		if (!ids.length) return []
		return await this.drizzle.db.select().from(player).where(inArray(player.id, ids))
	}

	async findMemberPlayers(): Promise<PlayerRow[]> {
		return await this.drizzle.db.select().from(player).where(eq(player.isMember, 1))
	}

	async findPlayerByEmail(email: string): Promise<PlayerRow | null> {
		const [p] = await this.drizzle.db.select().from(player).where(eq(player.email, email)).limit(1)

		return p ?? null
	}

	async findPlayerByUserId(userId: number): Promise<PlayerRow | null> {
		const [p] = await this.drizzle.db
			.select()
			.from(player)
			.where(eq(player.userId, userId))
			.limit(1)

		return p ?? null
	}

	async updatePlayer(playerId: number, data: Partial<PlayerInsert>): Promise<PlayerRow> {
		await this.drizzle.db.update(player).set(data).where(eq(player.id, playerId))
		return this.findPlayerById(playerId)
	}

	// ==================== REGISTRATION SLOT ====================

	async findRegistrationSlotById(
		slotId: number,
		tx?: MySql2Database,
	): Promise<RegistrationSlotRow> {
		const db = tx ?? this.drizzle.db
		const [slot] = await db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		if (!slot) {
			throw new Error(`No registration slot found with id ${slotId}`)
		}
		return slot
	}

	async findRegistrationSlotsByRegistrationId(
		registrationId: number,
	): Promise<RegistrationSlotRow[]> {
		const results = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.registrationId, registrationId))

		return results
	}

	async findRegistrationSlotByGgId(ggId: string): Promise<RegistrationSlotRow | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.ggId, ggId))
			.limit(1)
		return slot ?? null
	}

	async findSlotsWithStatusByRegistration(
		registrationId: number,
		statuses: RegistrationStatusValue[],
	): Promise<RegistrationSlotRow[]> {
		const results = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(
				and(
					eq(registrationSlot.registrationId, registrationId),
					inArray(registrationSlot.status, statuses),
				),
			)

		return results
	}

	async findRegistrationSlotsByEventId(
		eventId: number,
	): Promise<{ slot: RegistrationSlotRow; player: PlayerRow | null; hole: HoleRow | null }[]> {
		return this.drizzle.db
			.select({
				slot: registrationSlot,
				player,
				hole,
			})
			.from(registrationSlot)
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(eq(registrationSlot.eventId, eventId))
			.orderBy(registrationSlot.id, registrationSlot.slot)
	}

	async findRegistrationSlotWithHoleById(slotId: number): Promise<RegistrationSlotWithHole> {
		const [result] = await this.drizzle.db
			.select({
				slot: registrationSlot,
				hole: hole,
			})
			.from(registrationSlot)
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(eq(registrationSlot.id, slotId))
			.limit(1)

		if (!result) {
			throw new Error(`No registration slot found with id ${slotId}`)
		}

		if (!result.hole) {
			throw new Error(`No hole found for registration slot id ${slotId}`)
		}

		return {
			...result.slot,
			hole: result.hole,
		}
	}

	async findSlotsWithPlayerAndHole(registrationId: number): Promise<SlotWithPlayerAndHoleRow[]> {
		return this.drizzle.db
			.select({
				slot: registrationSlot,
				player: player,
				hole: hole,
			})
			.from(registrationSlot)
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(eq(registrationSlot.registrationId, registrationId))
	}

	async findAvailableSlots(
		eventId: number,
		courseId: number,
	): Promise<{ slot: RegistrationSlotRow; hole: HoleRow }[]> {
		return this.drizzle.db
			.select({
				slot: registrationSlot,
				hole: hole,
			})
			.from(registrationSlot)
			.innerJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					eq(registrationSlot.status, "A"),
					eq(hole.courseId, courseId),
				),
			)
	}

	async updateRegistrationSlot(
		slotId: number,
		data: Partial<RegistrationSlotInsert>,
		tx?: MySql2Database,
	): Promise<RegistrationSlotRow> {
		const db = tx ?? this.drizzle.db
		await db.update(registrationSlot).set(data).where(eq(registrationSlot.id, slotId))

		return this.findRegistrationSlotById(slotId, tx)
	}

	async updateRegistrationSlots(
		slotIds: number[],
		data: Partial<RegistrationSlotInsert>,
	): Promise<void> {
		if (slotIds.length === 0) return
		await this.drizzle.db
			.update(registrationSlot)
			.set(data)
			.where(inArray(registrationSlot.id, slotIds))
	}

	async deleteRegistrationSlotsByRegistration(registrationId: number): Promise<void> {
		await this.drizzle.db
			.delete(registrationSlot)
			.where(eq(registrationSlot.registrationId, registrationId))
	}

	async deleteRegistrationSlots(slotIds: number[]): Promise<void> {
		await this.drizzle.db.delete(registrationSlot).where(inArray(registrationSlot.id, slotIds))
	}

	// ==================== REGISTRATION ====================

	async findRegistrationById(registrationId: number): Promise<RegistrationRow | null> {
		const [reg] = await this.drizzle.db
			.select()
			.from(registration)
			.where(eq(registration.id, registrationId))
			.limit(1)
		return reg ?? null
	}

	async findRegistrationIdByEventAndPlayer(
		eventId: number,
		playerId: number,
		tx?: MySql2Database,
	): Promise<number | null> {
		const db = tx ?? this.drizzle.db
		const query = db
			.select()
			.from(registrationSlot)
			.where(and(eq(registrationSlot.eventId, eventId), eq(registrationSlot.playerId, playerId)))
			.limit(1)

		// Apply row lock when inside a transaction
		const [slot] = tx ? await query.for("update") : await query

		return slot?.registrationId ?? null
	}

	async findRegistrationIdsByEventAndPlayerName(
		eventId: number,
		searchText: string,
	): Promise<number[]> {
		const search = `%${searchText}%`
		const results = await this.drizzle.db
			.select({ registrationId: registrationSlot.registrationId })
			.from(registrationSlot)
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					or(like(player.firstName, search), like(player.lastName, search)),
				),
			)

		const ids = results.map((r) => r.registrationId!).filter(Boolean)
		return Array.from(new Set(ids))
	}

	async findRegistrationWithCourse(
		registrationId: number,
	): Promise<{ registration: RegistrationRow; course: CourseRow | null } | null> {
		const [result] = await this.drizzle.db
			.select({
				registration: registration,
				course: course,
			})
			.from(registration)
			.leftJoin(course, eq(registration.courseId, course.id))
			.where(eq(registration.id, registrationId))
			.limit(1)

		return result ?? null
	}

	async findRegistrationByUserAndEvent(
		userId: number,
		eventId: number,
	): Promise<RegistrationWithSlots | null> {
		const results = await this.drizzle.db
			.select({
				registration,
				slot: registrationSlot,
			})
			.from(registration)
			.leftJoin(registrationSlot, eq(registrationSlot.registrationId, registration.id))
			.where(and(eq(registration.userId, userId), eq(registration.eventId, eventId)))

		if (results.length === 0) return null

		const reg = results[0].registration
		const slots: RegistrationSlotRow[] = []

		for (const row of results) {
			if (row.slot) {
				slots.push(row.slot)
			}
		}

		return { ...reg, slots }
	}

	async findExpiredPendingRegistrations(now: Date): Promise<RegistrationWithSlots[]> {
		const nowStr = toDbString(now)
		const results = await this.drizzle.db
			.select({
				registration,
				slot: registrationSlot,
			})
			.from(registration)
			.innerJoin(registrationSlot, eq(registrationSlot.registrationId, registration.id))
			.where(and(lt(registration.expires, sql`${nowStr}`), eq(registrationSlot.status, "P")))

		if (results.length === 0) return []

		const registrationsMap = new Map<number, RegistrationWithSlots>()

		for (const row of results) {
			if (!registrationsMap.has(row.registration.id)) {
				registrationsMap.set(row.registration.id, {
					...row.registration,
					slots: [],
				})
			}
			if (row.slot) {
				registrationsMap.get(row.registration.id)!.slots.push(row.slot)
			}
		}

		return Array.from(registrationsMap.values())
	}

	async findRegistrationFullById(registrationId: number): Promise<RegistrationFull> {
		const results = await this.drizzle.db
			.select({
				registration,
				slot: registrationSlot,
				player,
				fee: registrationFee,
			})
			.from(registration)
			.leftJoin(registrationSlot, eq(registrationSlot.registrationId, registration.id))
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(registrationFee, eq(registrationFee.registrationSlotId, registrationSlot.id))
			.where(eq(registration.id, registrationId))

		if (results.length === 0) throw new Error(`No registration for id ${registrationId}`)

		const reg = results[0].registration
		const slotsMap = new Map<number, RegistrationSlotFull>()

		for (const row of results) {
			if (!row.slot) continue

			if (!slotsMap.has(row.slot.id)) {
				slotsMap.set(row.slot.id, {
					...row.slot,
					player: row.player ?? undefined,
					fees: [],
				})
			}

			if (row.fee) {
				slotsMap.get(row.slot.id)?.fees?.push(row.fee)
			}
		}

		return {
			...reg,
			slots: Array.from(slotsMap.values()),
		}
	}

	async findCompleteRegistrationById(
		registrationId: number,
	): Promise<CompleteRegistrationRow | null> {
		const results = await this.drizzle.db
			.select({
				registration,
				course,
				slot: registrationSlot,
				player,
				hole,
				fee: registrationFee,
				eventFee,
				feeType,
			})
			.from(registration)
			.leftJoin(course, eq(registration.courseId, course.id))
			.leftJoin(registrationSlot, eq(registrationSlot.registrationId, registration.id))
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.leftJoin(registrationFee, eq(registrationFee.registrationSlotId, registrationSlot.id))
			.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(registration.id, registrationId))

		if (results.length === 0) return null

		const reg = results[0].registration
		const courseRow = results[0].course
		const slotsMap = new Map<number, CompleteRegistrationSlotRow>()

		for (const row of results) {
			if (!row.slot) continue

			if (!slotsMap.has(row.slot.id)) {
				if (row.player) {
					slotsMap.set(row.slot.id, {
						...row.slot,
						player: row.player,
						hole: row.hole,
						fees: [],
					})
				} else {
					this.logger.warn(`Slot ${row.slot.id} missing player - skipping`)
				}
			}

			if (row.fee && row.eventFee && row.feeType) {
				const slot = slotsMap.get(row.slot.id)
				if (slot) {
					slot.fees.push({
						fee: row.fee,
						eventFee: row.eventFee,
						feeType: row.feeType,
					})
				}
			}
		}

		return {
			...reg,
			course: courseRow,
			slots: Array.from(slotsMap.values()),
		}
	}

	async createRegistration(data: RegistrationInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(registration).values(data)
		return Number(result.insertId)
	}

	async updateRegistration(
		registrationId: number,
		data: Partial<RegistrationInsert>,
	): Promise<void> {
		await this.drizzle.db.update(registration).set(data).where(eq(registration.id, registrationId))
	}

	async deleteRegistration(registrationId: number): Promise<void> {
		await this.drizzle.db.delete(registration).where(eq(registration.id, registrationId))
	}

	// ==================== REGISTRATION FEE ====================

	async findRegistrationFeesByRegistrationId(
		registrationId: number,
		confirmedOnly?: boolean,
	): Promise<RegistrationFeeRow[]> {
		const results = await this.drizzle.db
			.select({ fee: registrationFee })
			.from(registrationFee)
			.innerJoin(registrationSlot, eq(registrationFee.registrationSlotId, registrationSlot.id))
			.innerJoin(payment, eq(registrationFee.paymentId, payment.id))
			.where(
				confirmedOnly
					? and(eq(registrationSlot.registrationId, registrationId), eq(payment.confirmed, 1))
					: eq(registrationSlot.registrationId, registrationId),
			)

		return results.map((r) => r.fee)
	}

	async findFeesWithEventFeeAndFeeType(slotIds: number[]): Promise<FeeWithEventFeeRow[]> {
		if (slotIds.length === 0) {
			return []
		}

		return this.drizzle.db
			.select({
				fee: registrationFee,
				eventFee: eventFee,
				feeType: feeType,
			})
			.from(registrationFee)
			.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(inArray(registrationFee.registrationSlotId, slotIds))
	}

	async createRegistrationFee(data: RegistrationFeeInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(registrationFee).values(data)
		return Number(result.insertId)
	}

	async deleteRegistrationFeesByPayment(paymentId: number): Promise<void> {
		await this.drizzle.db.delete(registrationFee).where(eq(registrationFee.paymentId, paymentId))
	}
}
