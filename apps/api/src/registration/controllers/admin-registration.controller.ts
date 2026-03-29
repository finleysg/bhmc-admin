import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Inject,
	Logger,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	Req,
} from "@nestjs/common"
import type {
	AdminRegistration,
	AvailableSlotGroup,
	RefundRequest,
	Player,
	PlayerQuery,
	PlayerUpdate,
	RegisteredPlayer,
	CompleteRegistration,
	ReplacePlayerRequest,
	ReplacePlayerResponse,
	MovePlayersRequest,
	MovePlayersResponse,
	SwapPlayersRequest,
	SwapPlayersResponse,
	UpdateNotesRequest,
	DropPlayersRequest,
	DropPlayersResponse,
} from "@repo/domain/types"

import { Admin, type AuthenticatedRequest, Roles } from "../../auth"
import { EventsService } from "../../events"
import { AdminRegistrationService } from "../services/admin-registration.service"
import { ChangeLogService } from "../services/changelog.service"
import { PaymentsService } from "../services/payments.service"
import { PlayerService } from "../services/player.service"
import { RefundService } from "../services/refund.service"
import { RegistrationService } from "../services/registration.service"

function buildRefundRequests(paidFees: { id: number; paymentId: number }[]): RefundRequest[] {
	const grouped = new Map<number, number[]>()
	for (const fee of paidFees) {
		const existing = grouped.get(fee.paymentId)
		if (existing) {
			existing.push(fee.id)
		} else {
			grouped.set(fee.paymentId, [fee.id])
		}
	}
	return Array.from(grouped.entries()).map(([paymentId, registrationFeeIds]) => ({
		paymentId,
		registrationFeeIds,
	}))
}

@Controller("registration")
@Admin()
export class AdminRegistrationController {
	private readonly logger = new Logger(AdminRegistrationController.name)

	constructor(
		@Inject(AdminRegistrationService)
		private readonly adminRegistrationService: AdminRegistrationService,
		@Inject(ChangeLogService) private readonly changeLog: ChangeLogService,
		@Inject(PlayerService) private readonly adminRegisterService: PlayerService,
		@Inject(PaymentsService) private readonly paymentsService: PaymentsService,
		@Inject(RefundService) private readonly refundService: RefundService,
		@Inject(RegistrationService) private readonly registrationService: RegistrationService,
		@Inject(EventsService) private readonly events: EventsService,
	) {}

	@Get("players")
	async playerQuery(@Query() query: PlayerQuery) {
		const obj: PlayerQuery = {
			searchText: query.searchText,
			isMember: query.isMember === undefined ? undefined : String(query.isMember) === "true",
			eventId: query.eventId ? Number(query.eventId) : undefined,
			excludeRegistered:
				query.excludeRegistered === undefined
					? undefined
					: String(query.excludeRegistered) === "true",
		}
		this.logger.log("Player search query: {query}", obj)
		return this.adminRegisterService.searchPlayers(obj)
	}

	@Get("players/:playerId")
	async getPlayer(@Param("playerId", ParseIntPipe) playerId: number): Promise<Player> {
		return this.adminRegisterService.findPlayerById(playerId)
	}

	@Patch("players/:playerId")
	async updatePlayer(
		@Param("playerId", ParseIntPipe) playerId: number,
		@Body() body: PlayerUpdate,
	): Promise<Player> {
		return this.adminRegisterService.updatePlayer(playerId, body)
	}

	@Get(":eventId/groups/search")
	async searchGroups(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("searchText") searchText: string,
	): Promise<CompleteRegistration[]> {
		if (!searchText?.trim()) {
			return []
		}
		return this.adminRegisterService.findGroups(eventId, searchText)
	}

	@Get(":eventId/groups/:playerId")
	async getGroup(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("playerId", ParseIntPipe) playerId: number,
	): Promise<CompleteRegistration> {
		return this.adminRegisterService.findGroup(eventId, playerId)
	}

	@Post(":eventId/admin-registration")
	async createAdminRegistration(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() dto: AdminRegistration,
		@Req() req: AuthenticatedRequest,
	) {
		this.logger.log(`Admin ${dto.signedUpBy} registering user ${dto.userId} for event ${eventId}.`)
		const { registrationId, paymentId } =
			await this.adminRegistrationService.createAdminRegistration(eventId, dto)

		this.logger.log(
			`Sending payment request notification to user ${dto.userId} for event ${eventId}.`,
		)
		await this.adminRegistrationService.sendAdminRegistrationNotification(
			eventId,
			registrationId,
			paymentId,
			dto.collectPayment,
		)

		const playerNames = await this.changeLog.resolvePlayerNames(dto.slots.map((s) => s.playerId))
		void this.changeLog.log({
			eventId,
			registrationId,
			action: "admin_create",
			actorId: req.user.id,
			isAdmin: true,
			details: { players: playerNames, signedUpBy: dto.signedUpBy },
		})

		return { registrationId, paymentId }
	}

	@Get(":eventId/players")
	async getRegisteredPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<RegisteredPlayer[]> {
		return await this.adminRegisterService.getRegisteredPlayers(eventId)
	}

	@Get(":eventId/available-slots")
	@Roles()
	async getAvailableSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("courseId", ParseIntPipe) courseId: number,
		@Query("players", ParseIntPipe) players: number,
	): Promise<AvailableSlotGroup[]> {
		return await this.adminRegisterService.getAvailableSlots(eventId, courseId, players)
	}

	@Get(":eventId/available-spots")
	async getAvailableSpots(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<{ availableSpots: number; totalSpots: number }> {
		return await this.registrationService.getAvailableSpots(eventId)
	}

	@Post(":eventId/reserve-admin-slots")
	async reserveAdminSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() slotIds: number[],
	) {
		return this.adminRegisterService.reserveSlots(eventId, slotIds)
	}

	@Post(":eventId/drop-players")
	@Roles()
	async dropPlayers(
		@Param("eventId", ParseIntPipe) _eventId: number,
		@Body() request: DropPlayersRequest,
		@Req() req: AuthenticatedRequest,
	): Promise<DropPlayersResponse> {
		const isAdmin = req.user.isStaff || req.user.isSuperuser
		let shouldRefund = request.autoRefund ?? !isAdmin

		// Non-admin users must be a member of the registration group
		if (!isAdmin) {
			await this.registrationService.findRegistrationById(request.registrationId, req.user.playerId)
		}

		// Non-admin auto-refunds are only available before signupEnd
		if (shouldRefund && !isAdmin) {
			const event = await this.events.getEventById(_eventId)
			if (event.signupEnd && new Date() >= new Date(event.signupEnd)) {
				shouldRefund = false
			}
		}

		// Resolve player names BEFORE the drop (drop detaches players from slots)
		const reg = await this.registrationService.findRegistrationById(request.registrationId)
		const slotIdsSet = new Set(request.slotIds)
		const droppedPlayerIds = reg.slots
			.filter((s) => slotIdsSet.has(s.id))
			.map((s) => s.playerId)
			.filter((id): id is number => id !== null)
		const playerNames = await this.changeLog.resolvePlayerNames(droppedPlayerIds)

		// Collect paid fees BEFORE the drop (drop detaches fees from slots)
		const paidFees = shouldRefund
			? await this.paymentsService.findPaidFeesBySlotIds(request.slotIds)
			: []

		const droppedCount = await this.adminRegisterService.dropPlayers(
			request.registrationId,
			request.slotIds,
		)

		// Auto-refund when requested (always for non-admin, opt-in for admin)
		if (shouldRefund && paidFees.length > 0) {
			try {
				const refundRequests = buildRefundRequests(paidFees)
				await this.refundService.processRefunds(refundRequests, req.user.id)
			} catch (error) {
				this.logger.error(
					`Failed to process automatic refund for registration ${request.registrationId}`,
					error,
				)
			}
		}

		const details: Record<string, unknown> = { players: playerNames }
		if (shouldRefund && paidFees.length > 0) {
			details.refunded = true
		}
		void this.changeLog.log({
			eventId: _eventId,
			registrationId: request.registrationId,
			action: "drop",
			actorId: req.user.id,
			isAdmin,
			details,
		})

		return { droppedCount }
	}

	@Post(":eventId/replace-player")
	@Roles()
	async replacePlayer(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: ReplacePlayerRequest,
		@Req() req: AuthenticatedRequest,
	): Promise<ReplacePlayerResponse> {
		this.logger.log(
			`Replacing player ${request.originalPlayerId} with ${request.replacementPlayerId} in slot ${request.slotId} for event ${eventId}`,
		)

		const isAdmin = req.user.isStaff || req.user.isSuperuser

		// Non-admin users must be a member of the registration group
		if (!isAdmin) {
			const slot = await this.registrationService.findSlotById(request.slotId)
			if (!slot.registrationId) {
				throw new ForbiddenException("Slot is not part of a registration")
			}
			await this.registrationService.findRegistrationById(slot.registrationId, req.user.playerId)
		}

		const result = await this.adminRegisterService.replacePlayer(eventId, request)

		const slot = await this.registrationService.findSlotById(request.slotId)
		const [droppedNames, addedNames, startInfo] = await Promise.all([
			this.changeLog.resolvePlayerNames([request.originalPlayerId]),
			this.changeLog.resolvePlayerNames([request.replacementPlayerId]),
			this.changeLog.resolveStartInfo(slot.registrationId, eventId),
		])
		const details: Record<string, unknown> = {
			droppedPlayer: droppedNames[0],
			addedPlayer: addedNames[0],
			...startInfo,
		}
		if (result.greenFeeDifference) {
			details.feeDifference = result.greenFeeDifference
		}
		void this.changeLog.log({
			eventId,
			registrationId: slot.registrationId,
			action: "replace",
			actorId: req.user.id,
			isAdmin,
			details,
		})

		return result
	}

	@Post(":eventId/move-players")
	@Roles()
	async movePlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: MovePlayersRequest,
		@Req() req: AuthenticatedRequest,
	): Promise<MovePlayersResponse> {
		this.logger.log(
			`Moving ${request.sourceSlotIds.length} players to hole ${request.destinationStartingHoleId} order ${request.destinationStartingOrder} for event ${eventId}`,
		)

		const isAdmin = req.user.isStaff || req.user.isSuperuser
		const sourceSlot = await this.registrationService.findSlotById(request.sourceSlotIds[0])

		// Non-admin users must be a member of the registration group
		if (!isAdmin) {
			if (!sourceSlot.registrationId) {
				throw new ForbiddenException("Slot is not part of a registration")
			}
			await this.registrationService.findRegistrationById(
				sourceSlot.registrationId,
				req.user.playerId,
			)
		}

		const result = await this.adminRegisterService.movePlayers(eventId, request)

		const moveDetails = await this.changeLog.resolveMoveDetails(
			sourceSlot.registrationId,
			eventId,
			sourceSlot,
			request.destinationStartingHoleId,
			request.destinationStartingOrder,
		)
		void this.changeLog.log({
			eventId,
			registrationId: sourceSlot.registrationId,
			action: "move",
			actorId: req.user.id,
			isAdmin,
			details: moveDetails,
		})

		return result
	}

	@Post(":eventId/swap-players")
	async swapPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: SwapPlayersRequest,
		@Req() req: AuthenticatedRequest,
	): Promise<SwapPlayersResponse> {
		this.logger.log(
			`Swapping player ${request.playerAId} in slot ${request.slotAId} with player ${request.playerBId} in slot ${request.slotBId} for event ${eventId}`,
		)
		const result = await this.adminRegisterService.swapPlayers(eventId, request)

		const slotA = await this.registrationService.findSlotById(request.slotAId)
		void this.changeLog.log({
			eventId,
			registrationId: slotA.registrationId,
			action: "swap",
			actorId: req.user.id,
			isAdmin: true,
			details: { player1: result.playerAName, player2: result.playerBName },
		})

		return result
	}

	@Post(":registrationId/update-notes")
	async updateNotes(
		@Param("registrationId", ParseIntPipe) registrationId: number,
		@Body() request: UpdateNotesRequest,
		@Req() req: AuthenticatedRequest,
	): Promise<{ success: boolean }> {
		this.logger.log(`Updating notes for registration ${registrationId}`)
		await this.adminRegisterService.updateNotes(registrationId, request.notes)

		const reg = await this.registrationService.findRegistrationById(registrationId)
		void this.changeLog.log({
			eventId: reg.eventId,
			registrationId,
			action: "update_notes",
			actorId: req.user.id,
			isAdmin: true,
			details: { notes: request.notes },
		})

		return { success: true }
	}

	@Post("refund")
	async processRefunds(@Body() refundRequests: RefundRequest[], @Req() req: AuthenticatedRequest) {
		await this.refundService.processRefunds(refundRequests, req.user.id)

		for (const refundReq of refundRequests) {
			const payment = await this.paymentsService.findPaymentById(refundReq.paymentId)
			if (payment) {
				const registrationId =
					refundReq.registrationFeeIds.length > 0
						? await this.changeLog.resolveRegistrationIdFromFeeId(refundReq.registrationFeeIds[0])
						: null

				void this.changeLog.log({
					eventId: payment.eventId,
					registrationId: registrationId ?? 0,
					action: "refund",
					actorId: req.user.id,
					isAdmin: true,
					details: { amount: payment.paymentAmount, paymentId: refundReq.paymentId },
				})
			}
		}

		return { success: true }
	}
}
