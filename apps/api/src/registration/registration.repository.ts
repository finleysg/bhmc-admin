import { and, eq, inArray, or, like } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import {
	Player,
	Registration,
	RegistrationFee,
	RegistrationSlot,
	RegistrationStatusChoices,
} from "@repo/domain/types"

import {
	course,
	DrizzleService,
	eventFee,
	feeType,
	hole,
	payment,
	player,
	refund,
	registration,
	registrationFee,
	registrationSlot,
	type CourseRow,
	type HoleRow,
	type PaymentRow,
	type PlayerRow,
	type RefundInsert,
	type RegistrationFeeRow,
	type RegistrationRow,
	type RegistrationSlotRow,
	type RegistrationSlotInsert,
	type PlayerInsert,
} from "../database"
import {
	toPlayer,
	toRegistration,
	toRegistrationFee,
	toRegistrationSlot,
	type FeeWithEventFeeRow,
	type SlotWithPlayerAndHoleRow,
} from "./mappers"

@Injectable()
export class RegistrationRepository {
	constructor(private drizzle: DrizzleService) {}

	// register_player
	async findPlayerById(id: number): Promise<Player> {
		const [p] = await this.drizzle.db.select().from(player).where(eq(player.id, id)).limit(1)
		if (!p) {
			throw new Error(`No player found with id ${id}`)
		}
		return toPlayer(p)
	}

	async findPlayerRowById(id: number): Promise<PlayerRow> {
		const [p] = await this.drizzle.db.select().from(player).where(eq(player.id, id)).limit(1)
		if (!p) {
			throw new Error(`No player found with id ${id}`)
		}
		return p
	}

	async findPlayersByIds(ids: number[]): Promise<Player[]> {
		if (!ids.length) return []
		const results = await this.drizzle.db.select().from(player).where(inArray(player.id, ids))
		return results.map(toPlayer)
	}

	async findMemberPlayers(): Promise<Player[]> {
		const players = await this.drizzle.db.select().from(player).where(eq(player.isMember, 1))
		return players.map(toPlayer)
	}

	async updatePlayer(playerId: number, data: Partial<PlayerInsert>): Promise<Player> {
		await this.drizzle.db.update(player).set(data).where(eq(player.id, playerId))
		return this.findPlayerById(playerId)
	}

	// Registration slots
	async updateRegistrationSlot(
		slotId: number,
		data: Partial<RegistrationSlotInsert>,
	): Promise<RegistrationSlot> {
		await this.drizzle.db.update(registrationSlot).set(data).where(eq(registrationSlot.id, slotId))

		return this.findRegistrationSlotById(slotId)
	}

	async findRegistrationSlotById(slotId: number): Promise<RegistrationSlot> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		if (!slot) {
			throw new Error(`No registration slot found with id ${slotId}`)
		}
		return toRegistrationSlot(slot)
	}

	async findRegistrationSlotRowById(slotId: number): Promise<RegistrationSlotRow> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		if (!slot) {
			throw new Error(`No registration slot found with id ${slotId}`)
		}
		return slot
	}

	async findRegistrationSlotByGgId(ggId: string): Promise<RegistrationSlot | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.ggId, ggId))
			.limit(1)
		return slot ? toRegistrationSlot(slot) : null
	}

	async findRegistrationById(registrationId: number): Promise<Registration | null> {
		const [reg] = await this.drizzle.db
			.select()
			.from(registration)
			.where(eq(registration.id, registrationId))
			.limit(1)
		return reg ? toRegistration(reg) : null
	}

	async findRegistrationRowById(registrationId: number): Promise<RegistrationRow | null> {
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
	): Promise<number | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(and(eq(registrationSlot.eventId, eventId), eq(registrationSlot.playerId, playerId)))
			.limit(1)

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
					eq(registrationSlot.status, RegistrationStatusChoices.AVAILABLE),
					eq(hole.courseId, courseId),
				),
			)
	}

	async findPaymentWithDetailsById(
		paymentId: number,
	): Promise<{ payment: PaymentRow; details: RegistrationFeeRow[] } | null> {
		const results = await this.drizzle.db
			.select({
				payment,
				details: registrationFee,
			})
			.from(payment)
			.leftJoin(registrationFee, eq(payment.id, registrationFee.paymentId))
			.where(eq(payment.id, paymentId))

		if (!results[0]?.payment) return null

		return {
			payment: results[0].payment,
			details: results
				.filter(
					(r): r is { payment: PaymentRow; details: RegistrationFeeRow } => r.details !== null,
				)
				.map((r) => r.details),
		}
	}

	async findRegistrationFeesByPayment(paymentId: number): Promise<RegistrationFee[]> {
		const results = await this.drizzle.db
			.select()
			.from(registrationFee)
			.where(eq(registrationFee.paymentId, paymentId))

		return results.map(toRegistrationFee)
	}

	async createRefund(data: RefundInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(refund).values(data)
		return Number(result.insertId)
	}

	async updateRefundCode(refundId: number, refundCode: string): Promise<void> {
		await this.drizzle.db.update(refund).set({ refundCode }).where(eq(refund.id, refundId))
	}

	async updateRegistrationFeeStatus(feeIds: number[], isPaid: boolean): Promise<void> {
		if (feeIds.length === 0) return
		await this.drizzle.db
			.update(registrationFee)
			.set({ isPaid: isPaid ? 1 : 0 })
			.where(inArray(registrationFee.id, feeIds))
	}
}
