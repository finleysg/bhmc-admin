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
	Payment,
	Refund,
	RefundRequest,
	RegistrationSlot,
	RegistrationStatusChoices,
	PlayerQuery,
	CompleteClubEvent,
	RegisteredPlayer,
	CompleteRegistration,
	CompleteRegistrationFee,
	CompletePayment,
	CompleteRegistrationAndPayment,
	EventTypeChoices,
} from "@repo/domain/types"

import { toCourse, toHole } from "../../courses/mappers"
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
} from "../../database"
import { EventsService } from "../../events"
import { MailService } from "../../mail/mail.service"
import { StripeService } from "../../stripe/stripe.service"
import {
	attachFeesToSlots,
	hydrateSlotsWithPlayerAndHole,
	toCompleteRegistration,
	toPayment,
	toPlayer,
	toRefund,
	toRegistration,
	toRegistrationFeeWithEventFee,
	toRegistrationSlot,
} from "../mappers"
import { RegistrationRepository } from "../repositories/registration.repository"
import { PaymentsRepository } from "../repositories/payments.repository"
import { RegistrationBroadcastService } from "./registration-broadcast.service"

type ActualFeeAmount = {
	eventFeeId: number
	amount: number
}
type AdminRegistrationSlotWithAmount = Omit<AdminRegistrationSlot, "feeIds"> & {
	amounts: ActualFeeAmount[]
}

@Injectable()
export class AdminRegistrationService {
	private readonly logger = new Logger(AdminRegistrationService.name)

	constructor(
		private drizzle: DrizzleService,
		private repository: RegistrationRepository,
		private readonly paymentsRepository: PaymentsRepository,
		private readonly events: EventsService,
		private readonly mailService: MailService,
		private readonly stripeService: StripeService,
		private readonly broadcast: RegistrationBroadcastService,
	) {}

	async getRegisteredPlayers(eventId: number): Promise<RegisteredPlayer[]> {
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

		const slotsMap = new Map<number, RegisteredPlayer>()
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

			parent.fees.push(fee as CompleteRegistrationFee)
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

	async findGroup(eventId: number, playerId: number): Promise<CompleteRegistration> {
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

	async findGroups(eventId: number, searchText: string): Promise<CompleteRegistration[]> {
		this.logger.log(`Searching groups for event ${eventId} with text "${searchText}"`)

		const registrationIds = await this.repository.findRegistrationIdsByEventAndPlayerName(
			eventId,
			searchText,
		)
		this.logger.log(`Found ${registrationIds.length} matching registration IDs`)

		const results: CompleteRegistration[] = []
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
		const row = await this.repository.updatePlayer(playerId, { ggId })
		return toPlayer(row)
	}

	async updateRegistrationSlotGgId(slotId: number, ggId: string): Promise<RegistrationSlot> {
		const row = await this.repository.updateRegistrationSlot(slotId, { ggId })
		return toRegistrationSlot(row)
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

		const eventRecord = await this.events.getCompleteClubEventById(eventId, false)
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

		// Membership registration?
		if (eventRecord.eventType === EventTypeChoices.SEASON_REGISTRATION) {
			const season = new Date(eventRecord.startDate).getFullYear()
			for (const slot of convertedSlots) {
				await this.updateMembershipStatus(slot.playerId, season)
			}
		}

		// Send notification emails
		try {
			await this.sendAdminRegistrationEmails(
				eventRecord,
				registrationId,
				paymentId,
				dto.userId,
				dto.collectPayment,
			)
		} catch (error) {
			this.logger.error(`Failed to send admin registration emails: ${String(error)}`)
		}

		if (eventRecord.canChoose) {
			this.broadcast.notifyChange(eventId)
		}

		return paymentId
	}

	// TODO: seems like this can be simplified
	private async sendAdminRegistrationEmails(
		event: CompleteClubEvent,
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
		eventRecord: CompleteClubEvent,
		slots: AdminRegistrationSlot[],
	): Promise<AdminRegistrationSlotWithAmount[]> {
		const startDate = new Date(eventRecord.startDate)
		const convertedSlots: AdminRegistrationSlotWithAmount[] = []

		const playerIds = Array.from(new Set(slots.map((slot) => slot.playerId)))
		const players = await this.repository.findPlayersByIds(playerIds)
		const playerLookup = new Map<number, Player>(players.map((p) => [p.id, toPlayer(p)]))

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
		const registrationId = await this.drizzle.db.transaction(async (tx) => {
			const [registrationResult] = await tx.insert(registration).values({
				eventId,
				createdDate: toDbString(new Date()),
			})
			const regId = Number(registrationResult.insertId)

			const updateResult = await tx
				.update(registrationSlot)
				.set({
					registrationId: regId,
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

			return regId
		})

		this.broadcast.notifyChange(eventId)
		return registrationId
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

		const eventRecord = await this.events.getCompleteClubEventById(
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

		if (eventRecord.canChoose) {
			this.broadcast.notifyChange(eventRecord.id)
		}

		return slotIds.length
	}

	async processRefunds(requests: RefundRequest[], issuerId: number): Promise<void> {
		if (!requests.length) {
			throw new BadRequestException("At least one refund request is required")
		}

		for (const request of requests) {
			const paymentRecord = await this.paymentsRepository.findPaymentWithDetailsById(
				request.paymentId,
			)
			if (!paymentRecord || !paymentRecord.paymentCode || !paymentRecord.paymentDetails.length) {
				throw new NotFoundException(`Payment ${request.paymentId} is not valid for refund`)
			}

			const refundAmount = paymentRecord.paymentDetails.reduce((total: number, fee) => {
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
					paymentRecord.paymentCode,
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

	/**
	 * Clean up expired pending registrations.
	 * Called by cron job.
	 */
	async cleanUpExpired(): Promise<number> {
		const now = new Date()
		const expired = await this.repository.findExpiredPendingRegistrations(now)

		if (expired.length === 0) return 0

		this.logger.log(`Cleaning up ${expired.length} expired registrations`)

		for (const reg of expired) {
			// Delete related payment data
			const payments = await this.paymentsRepository.findPaymentsForRegistration(reg.id)
			this.logger.log(`Found ${payments.length} payments to delete.`)
			for (const payment of payments) {
				this.logger.log(`Deleting fees and payment for id ${payment.id}`)
				await this.paymentsRepository.deletePaymentDetailsByPayment(payment.id)
				await this.paymentsRepository.deletePayment(payment.id)
			}

			const canChoose = await this.events.isCanChooseHolesEvent(reg.eventId)
			if (canChoose) {
				// For choosable events, reset slots to AVAILABLE
				const slotIds = reg.slots.map((s) => s.id)
				await this.repository.updateRegistrationSlots(slotIds, {
					status: RegistrationStatusChoices.AVAILABLE,
					registrationId: null,
					playerId: null,
				})
				this.broadcast.notifyChange(reg.eventId)
			} else {
				// For non-choosable events, delete the slots
				await this.repository.deleteRegistrationSlotsByRegistration(reg.id)
			}

			// Delete the registration
			await this.repository.deleteRegistration(reg.id)
		}

		return expired.length
	}

	/**
	 * Transition slots from AWAITING_PAYMENT to RESERVED.
	 * Called by webhook when payment succeeds.
	 */
	async paymentConfirmed(registrationId: number, paymentId: number): Promise<void> {
		const reg = await this.repository.findRegistrationById(registrationId)
		const slots = await this.repository.findSlotsWithStatusByRegistration(registrationId, [
			RegistrationStatusChoices.AWAITING_PAYMENT,
		])

		if (slots.length > 0) {
			const slotIds = slots.map((s) => s.id)
			await this.repository.updateRegistrationSlots(slotIds, {
				status: RegistrationStatusChoices.RESERVED,
			})
		}

		// Mark payment as confirmed
		await this.paymentsRepository.updatePayment(paymentId, {
			confirmed: 1,
			confirmDate: toDbString(new Date()),
		})

		// Mark registration fees as paid
		const feeRows = await this.paymentsRepository.findPaymentDetailsByPayment(paymentId)
		const feeIds = feeRows.map((f) => f.id)
		await this.paymentsRepository.updatePaymentDetailStatus(feeIds, true)

		if (reg) {
			const event = await this.events.getEventById(reg.eventId)
			if (event.canChoose) {
				this.broadcast.notifyChange(reg.eventId)
			}
		}
	}

	/**
	 * Retrieve a fully validated CompleteRegistrationAndPayment.
	 * Throws NotFoundException if registration or payment not found.
	 */
	async getCompleteRegistrationAndPayment(
		registrationId: number,
		paymentId: number,
	): Promise<CompleteRegistrationAndPayment> {
		const regRow = await this.repository.findCompleteRegistrationById(registrationId)

		if (!regRow) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const completeRegistration = toCompleteRegistration(regRow)

		const paymentRow = await this.paymentsRepository.findPaymentById(paymentId)

		if (!paymentRow) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		const allFees = completeRegistration.slots.flatMap((slot) => slot.fees)
		const completePayment: CompletePayment = {
			...toPayment(paymentRow),
			details: allFees,
		}

		return {
			registration: completeRegistration,
			payment: completePayment,
		}
	}

	async findPaymentByPaymentCode(paymentCode: string): Promise<Payment | null> {
		const row = await this.paymentsRepository.findByPaymentCode(paymentCode)
		return row ? toPayment(row) : null
	}

	async findRefundByRefundCode(refundCode: string): Promise<Refund | null> {
		const row = await this.paymentsRepository.findRefundByRefundCode(refundCode)
		return row ? toRefund(row) : null
	}

	async createRefund(data: {
		refundCode: string
		refundAmount: number
		notes: string
		issuerId: number
		paymentId: number
	}): Promise<number> {
		return this.paymentsRepository.createRefund({
			refundCode: data.refundCode,
			refundAmount: data.refundAmount.toFixed(2),
			notes: data.notes,
			confirmed: 0,
			refundDate: toDbString(new Date()),
			issuerId: data.issuerId,
			paymentId: data.paymentId,
		})
	}

	async confirmRefund(refundCode: string): Promise<void> {
		const row = await this.paymentsRepository.findRefundByRefundCode(refundCode)
		if (!row) {
			this.logger.warn(`Refund ${refundCode} not found for confirmation`)
			return
		}
		if (row.confirmed) {
			this.logger.log(`Refund ${refundCode} already confirmed`)
			return
		}
		await this.paymentsRepository.confirmRefund(row.id)
	}

	async updateMembershipStatus(userId: number, season: number): Promise<void> {
		const player = await this.repository.findPlayerByUserId(userId)
		if (player) {
			player.isMember = 1
			player.lastSeason = season
			await this.repository.updatePlayer(player.id, player)
		}
	}
}
