import { and, eq, inArray, isNotNull, like, or } from "drizzle-orm"

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import {
	calculateAmountDue,
	dummyCourse,
	dummyHole,
	getAmount,
	validateRegistration,
} from "@repo/domain/functions"
import {
	AdminRegistration,
	AdminRegistrationSlot,
	AvailableSlotGroup,
	Player,
	PlayerMap,
	PlayerRecord,
	RefundRequest,
	RegistrationSlot,
	RegistrationStatusChoices,
	PlayerQuery,
	ValidatedClubEvent,
	ValidatedRegisteredPlayer,
	ValidatedRegistration,
	ValidatedRegistrationFee,
} from "@repo/domain/types"

import { toCourse, toHole } from "../courses/mappers"
import {
	authUser,
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
	toDbString,
} from "../database"
import { EventsService } from "../events"
import { MailService } from "../mail/mail.service"
import { StripeService } from "../stripe/stripe.service"
import {
	attachFeesToSlots,
	hydrateSlotsWithPlayerAndHole,
	toPlayer,
	toRegistration,
	toRegistrationFeeWithEventFee,
	toRegistrationSlot,
} from "./mappers"
import { RegistrationRepository } from "./registration.repository"

type ActualFeeAmount = {
	eventFeeId: number
	amount: number
}
type AdminRegistrationSlotWithAmount = Omit<AdminRegistrationSlot, "feeIds"> & {
	amounts: ActualFeeAmount[]
}

@Injectable()
export class RegistrationService {
	private readonly logger = new Logger(RegistrationService.name)

	constructor(
		private drizzle: DrizzleService,
		private repository: RegistrationRepository,
		private readonly events: EventsService,
		private readonly mailService: MailService,
		private readonly stripeService: StripeService,
	) {}

	async getRegisteredPlayers(eventId: number): Promise<ValidatedRegisteredPlayer[]> {
		const rows = await this.drizzle.db
			.select({
				slot: registrationSlot,
				player: player,
				registration: registration,
				course: course,
				hole: hole,
			})
			.from(registrationSlot)
			.leftJoin(registration, eq(registrationSlot.registrationId, registration.id))
			.leftJoin(course, eq(registration.courseId, course.id))
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					eq(registrationSlot.status, RegistrationStatusChoices.RESERVED),
					isNotNull(registrationSlot.playerId),
				),
			)

		const slotsMap = new Map<number, ValidatedRegisteredPlayer>()
		const slotIds: number[] = []
		for (const row of rows) {
			this.logger.debug(`Processing slot ${row.slot.id} for player ${row.player?.id}`)
			const sid = row.slot.id
			slotIds.push(sid)
			slotsMap.set(sid, {
				slot: toRegistrationSlot(row.slot),
				player: toPlayer(row.player!),
				registration: toRegistration(row.registration!),
				course: row.course ? toCourse(row.course) : dummyCourse(),
				hole: row.hole ? toHole(row.hole) : dummyHole(),
				fees: [],
			})
		}

		if (slotIds.length === 0) return []

		const feeRows = await this.drizzle.db
			.select({
				fee: registrationFee,
				eventFee: eventFee,
				feeType: feeType,
			})
			.from(registrationFee)
			.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(inArray(registrationFee.registrationSlotId, slotIds))

		for (const frow of feeRows) {
			const sid = frow.fee.registrationSlotId
			if (!sid) continue

			const parent = slotsMap.get(sid)
			if (!parent || !parent.fees) continue

			if (!frow.eventFee || !frow.feeType) continue

			const fee = toRegistrationFeeWithEventFee({
				fee: frow.fee,
				eventFee: frow.eventFee,
				feeType: frow.feeType,
			})

			parent.fees.push(fee as ValidatedRegistrationFee)
		}

		const results = slotIds.map((id) => slotsMap.get(id)!)
		return results
	}

	async searchPlayers(query: PlayerQuery): Promise<Player[]> {
		const { searchText, isMember = true } = query
		let whereClause: ReturnType<typeof and> | ReturnType<typeof eq> | undefined = undefined

		if (searchText) {
			const search = `%${searchText}%`
			const searchCondition = or(
				like(player.firstName, search),
				like(player.lastName, search),
				like(player.ghin, search),
			)
			whereClause = isMember ? and(searchCondition, eq(player.isMember, 1)) : searchCondition
		} else if (isMember) {
			whereClause = eq(player.isMember, 1)
		}

		const results = await this.drizzle.db.select().from(player).where(whereClause)
		return results.map(toPlayer)
	}

	async findGroup(eventId: number, playerId: number): Promise<ValidatedRegistration> {
		const registrationId = await this.repository.findRegistrationIdByEventAndPlayer(
			eventId,
			playerId,
		)

		if (!registrationId) {
			throw new NotFoundException(`Player ${playerId} is not registered for event ${eventId}`)
		}

		const regWithCourse = await this.repository.findRegistrationWithCourse(registrationId)

		if (!regWithCourse) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const result = toRegistration(regWithCourse.registration)
		if (regWithCourse.course) {
			result.course = toCourse(regWithCourse.course)
		}

		const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const slots = hydrateSlotsWithPlayerAndHole(slotRows)

		const slotIds = slots
			.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
			.map((s) => s.id)
		const feeRows = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

		attachFeesToSlots(slots, feeRows)

		result.slots = slots

		try {
			const validatedResult = validateRegistration(result)
			return validatedResult
		} catch (error) {
			this.logger.warn(`Validation failed for registration ${registrationId}: ${String(error)}`)
			throw new BadRequestException("The registration is not valid")
		}
	}

	async findGroups(eventId: number, searchText: string): Promise<ValidatedRegistration[]> {
		this.logger.log(`Searching groups for event ${eventId} with text "${searchText}"`)

		const registrationIds = await this.repository.findRegistrationIdsByEventAndPlayerName(
			eventId,
			searchText,
		)
		this.logger.log(`Found ${registrationIds.length} matching registration IDs`)

		const results: ValidatedRegistration[] = []
		for (const registrationId of registrationIds) {
			const regWithCourse = await this.repository.findRegistrationWithCourse(registrationId)
			if (!regWithCourse) continue

			const result = toRegistration(regWithCourse.registration)
			if (regWithCourse.course) {
				result.course = toCourse(regWithCourse.course)
			}

			const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
			const slots = hydrateSlotsWithPlayerAndHole(slotRows)

			const slotIds = slots
				.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
				.map((s) => s.id)
			const feeRows = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

			attachFeesToSlots(slots, feeRows)

			result.slots = slots

			try {
				const validatedResult = validateRegistration(result)
				results.push(validatedResult)
			} catch (error) {
				this.logger.warn(
					`Skipping registration ${registrationId} due to validation error: ${String(error)}`,
				)
			}
		}
		return results
	}

	async updatePlayerGgId(playerId: number, ggId: string): Promise<Player> {
		return this.repository.updatePlayer(playerId, { ggId })
	}

	async updateRegistrationSlotGgId(slotId: number, ggId: string): Promise<RegistrationSlot> {
		return this.repository.updateRegistrationSlot(slotId, { ggId })
	}

	async getPlayerMapForEvent(eventId: number): Promise<PlayerMap> {
		const playerRecords = await this.drizzle.db
			.select({
				ggId: registrationSlot.ggId,
				id: player.id,
				firstName: player.firstName,
				lastName: player.lastName,
				email: player.email,
			})
			.from(registrationSlot)
			.innerJoin(player, eq(registrationSlot.playerId, player.id))
			.where(eq(registrationSlot.eventId, eventId))

		const playerMap = new Map<string, PlayerRecord>()
		for (const record of playerRecords) {
			if (record.ggId) {
				playerMap.set(record.ggId, {
					id: record.id,
					firstName: record.firstName,
					lastName: record.lastName,
					email: record.email,
				})
			}
		}
		return playerMap
	}

	async completeAdminRegistration(
		eventId: number,
		registrationId: number,
		dto: AdminRegistration,
	): Promise<number> {
		let paymentId: number = -1

		const [existingRegistration] = await this.drizzle.db
			.select()
			.from(registration)
			.where(and(eq(registration.id, registrationId), eq(registration.eventId, eventId)))
			.limit(1)

		if (!existingRegistration) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const eventRecord = await this.events.getValidatedClubEventById(eventId, false)
		if (!eventRecord) {
			throw new BadRequestException("event id not found")
		}

		const convertedSlots = await this.convertSlots(eventRecord, dto.slots)
		const allAmounts = convertedSlots.flatMap((slot) => slot.amounts.map((a) => a.amount))
		const totalAmountDue = calculateAmountDue(allAmounts)

		const expires = new Date()
		expires.setHours(expires.getHours() + dto.expires)

		await this.drizzle.db.transaction(async (tx) => {
			await tx
				.update(registration)
				.set({
					userId: dto.userId,
					signedUpBy: dto.signedUpBy,
					notes: dto.notes,
					courseId: dto.courseId,
					expires: toDbString(expires),
				})
				.where(eq(registration.id, registrationId))

			const paymentCode = dto.collectPayment ? "Requested" : "Waived"
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId,
				userId: dto.userId,
				paymentAmount: totalAmountDue.total.toFixed(2),
				transactionFee: totalAmountDue.transactionFee.toFixed(2),
				confirmed: 0,
				notificationType: "A",
			})
			paymentId = Number(paymentResult.insertId)

			for (const slot of convertedSlots) {
				await tx
					.update(registrationSlot)
					.set({
						status: RegistrationStatusChoices.AWAITING_PAYMENT,
						playerId: slot.playerId,
						holeId: dto.startingHoleId,
						startingOrder: dto.startingOrder,
					})
					.where(eq(registrationSlot.id, slot.slotId))

				for (const fee of slot.amounts) {
					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId: fee.eventFeeId,
						paymentId,
						registrationSlotId: slot.slotId,
						amount: fee.amount.toFixed(2),
					})
				}
			}
		})

		// Send notification emails (non-blocking)
		this.sendAdminRegistrationEmails(
			eventRecord,
			registrationId,
			paymentId,
			dto.userId,
			dto.collectPayment,
		).catch((error) => {
			this.logger.error(`Failed to send admin registration emails: ${error}`)
		})

		return paymentId
	}

	private async sendAdminRegistrationEmails(
		event: ValidatedClubEvent,
		registrationId: number,
		paymentId: number,
		paymentUserId: number,
		collectPayment: boolean,
	): Promise<void> {
		// Get payment user's email
		const [userRow] = await this.drizzle.db
			.select()
			.from(authUser)
			.where(eq(authUser.id, paymentUserId))
			.limit(1)

		if (!userRow) {
			this.logger.warn(`User ${paymentUserId} not found for admin registration notification`)
			return
		}

		// Build validated registration
		const regWithCourse = await this.repository.findRegistrationWithCourse(registrationId)
		if (!regWithCourse) {
			this.logger.warn(`Registration ${registrationId} not found`)
			return
		}

		const result = toRegistration(regWithCourse.registration)
		if (regWithCourse.course) {
			result.course = toCourse(regWithCourse.course)
		}

		const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const slots = hydrateSlotsWithPlayerAndHole(slotRows)

		const slotIds = slots.filter((s) => s.id !== undefined).map((s) => s.id)
		const feeRows = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)
		attachFeesToSlots(slots, feeRows)

		result.slots = slots

		const validatedReg = validateRegistration(result)

		await this.mailService.sendAdminRegistrationNotification(
			event,
			validatedReg,
			paymentId,
			userRow.email,
			collectPayment,
		)
	}

	async convertSlots(
		eventRecord: ValidatedClubEvent,
		slots: AdminRegistrationSlot[],
	): Promise<AdminRegistrationSlotWithAmount[]> {
		const startDate = new Date(eventRecord.startDate)
		const convertedSlots: AdminRegistrationSlotWithAmount[] = []

		const playerIds = Array.from(new Set(slots.map((slot) => slot.playerId)))
		const players = await this.repository.findPlayersByIds(playerIds)
		const playerLookup = new Map<number, Player>(players.map((p) => [p.id, p]))

		for (const slot of slots) {
			const convertedSlot: AdminRegistrationSlotWithAmount = {
				...slot,
				amounts: [],
			}
			const player = playerLookup.get(slot.playerId)
			const eventFees = eventRecord.eventFees.filter((ef) => slot.feeIds.includes(ef.id))
			convertedSlot.amounts = eventFees.map((ef) => {
				const playerAmount = getAmount(ef, player ?? ({} as Player), startDate)
				return { eventFeeId: ef.id, amount: playerAmount }
			})
			convertedSlots.push(convertedSlot)
		}
		return convertedSlots
	}

	async getAvailableSlots(
		eventId: number,
		courseId: number,
		players: number,
	): Promise<AvailableSlotGroup[]> {
		const slotRows = await this.repository.findAvailableSlots(eventId, courseId)

		const groups = new Map<string, RegistrationSlot[]>()
		for (const row of slotRows) {
			const holeNumber = row.hole.holeNumber
			const key = `${row.slot.holeId}-${holeNumber}-${row.slot.startingOrder}`
			if (!groups.has(key)) {
				groups.set(key, [])
			}
			const slot = toRegistrationSlot(row.slot)
			slot.hole = toHole(row.hole)
			groups.get(key)!.push(slot)
		}

		const result: AvailableSlotGroup[] = []
		for (const [key, slots] of groups) {
			if (slots.length >= players) {
				const [holeId, holeNumber, startingOrder] = key.split("-").map(Number)
				result.push({
					holeId,
					holeNumber,
					startingOrder,
					slots,
				})
			}
		}

		return result
	}

	async reserveSlots(eventId: number, slotIds: number[]): Promise<number> {
		return await this.drizzle.db.transaction(async (tx) => {
			const [registrationResult] = await tx.insert(registration).values({
				eventId,
				createdDate: toDbString(new Date()),
			})
			const registrationId = Number(registrationResult.insertId)

			const updateResult = await tx
				.update(registrationSlot)
				.set({
					registrationId,
					status: RegistrationStatusChoices.PENDING,
				})
				.where(
					and(
						inArray(registrationSlot.id, slotIds),
						eq(registrationSlot.eventId, eventId),
						eq(registrationSlot.status, RegistrationStatusChoices.AVAILABLE),
					),
				)

			const updateResultAny = updateResult as unknown
			this.logger.debug("Update result: " + JSON.stringify(updateResultAny))

			if (
				(updateResult as [{ affectedRows: number }, unknown])[0].affectedRows !== slotIds.length
			) {
				throw new BadRequestException("Not all requested slots are available!")
			}

			return registrationId
		})
	}

	async dropPlayers(registrationId: number, slotIds: number[]): Promise<number> {
		if (!slotIds.length) {
			throw new BadRequestException("At least one slot ID is required")
		}

		const allPlayerSlots = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const playerSlots = allPlayerSlots.filter((s) => slotIds.includes(s.slot.id))

		if (playerSlots.length !== slotIds.length) {
			throw new BadRequestException(
				`Not all slots provided belong to registration ${registrationId}`,
			)
		}
		if (playerSlots.some((row) => !row.player)) {
			throw new BadRequestException("Not all slots provided have a player assigned")
		}
		if (playerSlots.some((row) => row.slot.status !== RegistrationStatusChoices.RESERVED)) {
			throw new BadRequestException(
				`Not all slots provided have status ${RegistrationStatusChoices.RESERVED}`,
			)
		}

		const registrationRecord = await this.repository.findRegistrationById(registrationId)
		if (!registrationRecord) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const eventRecord = await this.events.getValidatedClubEventById(
			registrationRecord.eventId,
			false,
		)

		const droppedPlayerNames = playerSlots.map((row) => {
			const p = row.player
			return p ? `${p.firstName} ${p.lastName}`.trim() : "Unknown Player"
		})
		const currentNotes = registrationRecord.notes || ""
		const dropDate = new Date().toISOString().split("T")[0]
		const newNotes =
			`${currentNotes}\nDropped ${droppedPlayerNames.join(", ")} on ${dropDate}`.trim()

		await this.drizzle.db.transaction(async (tx) => {
			await tx
				.update(registration)
				.set({ notes: newNotes })
				.where(eq(registration.id, registrationId))

			await tx
				.update(registrationFee)
				.set({ registrationSlotId: null })
				.where(inArray(registrationFee.registrationSlotId, slotIds))

			if (eventRecord.canChoose) {
				await tx
					.update(registrationSlot)
					.set({
						registrationId: null,
						playerId: null,
						status: RegistrationStatusChoices.AVAILABLE,
					})
					.where(inArray(registrationSlot.id, slotIds))
			} else {
				await tx.delete(registrationSlot).where(inArray(registrationSlot.id, slotIds))
			}
		})

		return slotIds.length
	}

	async processRefunds(requests: RefundRequest[], issuerId: number): Promise<void> {
		if (!requests.length) {
			throw new BadRequestException("At least one refund request is required")
		}

		for (const request of requests) {
			const paymentRecord = await this.repository.findPaymentWithDetailsById(request.paymentId)
			if (!paymentRecord || !paymentRecord.payment.paymentCode || !paymentRecord.details.length) {
				throw new NotFoundException(`Payment ${request.paymentId} is not valid for refund`)
			}

			const refundAmount = paymentRecord.details.reduce((total: number, fee) => {
				const amount = fee.isPaid ? Math.round(parseFloat(fee.amount) * 100) : 0
				return total + amount
			}, 0)

			if (refundAmount <= 0) {
				throw new BadRequestException("Refund amount must be greater than zero")
			}

			const refundInDollars = refundAmount / 100

			let refundId: number
			try {
				refundId = await this.drizzle.db.transaction(async (tx) => {
					const refundRecord = {
						refundCode: "pending",
						refundAmount: refundInDollars.toFixed(2),
						confirmed: 0,
						refundDate: toDbString(new Date()),
						issuerId,
						paymentId: request.paymentId,
					}
					const [result] = await tx.insert(refund).values(refundRecord)
					const newRefundId = Number(result.insertId)

					if (request.registrationFeeIds.length > 0) {
						await tx
							.update(registrationFee)
							.set({ isPaid: 0 })
							.where(inArray(registrationFee.id, request.registrationFeeIds))
					}

					return newRefundId
				})
			} catch (dbError) {
				this.logger.error(
					`Failed to create pending refund record for payment ${request.paymentId}`,
					dbError,
				)
				throw dbError
			}

			try {
				const stripeRefundId = await this.stripeService.createRefund(
					paymentRecord.payment.paymentCode,
					refundInDollars,
				)

				await this.repository.updateRefundCode(refundId, stripeRefundId)
			} catch (stripeError) {
				this.logger.error(
					`Stripe refund failed for payment ${request.paymentId}. ` +
						`Refund record ${refundId} remains in pending state for manual review.`,
					stripeError,
				)
				throw stripeError
			}
		}
	}
}
