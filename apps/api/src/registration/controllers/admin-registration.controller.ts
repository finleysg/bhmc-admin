import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Inject,
	Logger,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Req,
} from "@nestjs/common"
import type {
	AdminRegistration,
	AvailableSlotGroup,
	RefundRequest,
	PlayerQuery,
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
import { AdminRegistrationService } from "../services/admin-registration.service"
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
		@Inject(PlayerService) private readonly adminRegisterService: PlayerService,
		@Inject(PaymentsService) private readonly paymentsService: PaymentsService,
		@Inject(RefundService) private readonly refundService: RefundService,
		@Inject(RegistrationService) private readonly registrationService: RegistrationService,
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

		// Non-admin users must be a member of the registration group
		if (!isAdmin) {
			await this.registrationService.findRegistrationById(request.registrationId, req.user.playerId)
		}

		// Collect paid fees BEFORE the drop (drop detaches fees from slots)
		const paidFees = isAdmin
			? []
			: await this.paymentsService.findPaidFeesBySlotIds(request.slotIds)

		const droppedCount = await this.adminRegisterService.dropPlayers(
			request.registrationId,
			request.slotIds,
		)

		// Auto-refund for non-admin users
		if (!isAdmin && paidFees.length > 0) {
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

		// Non-admin users must be a member of the registration group
		if (!req.user.isStaff && !req.user.isSuperuser) {
			const slot = await this.registrationService.findSlotById(request.slotId)
			if (!slot.registrationId) {
				throw new ForbiddenException("Slot is not part of a registration")
			}
			await this.registrationService.findRegistrationById(slot.registrationId, req.user.playerId)
		}

		return this.adminRegisterService.replacePlayer(eventId, request)
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

		// Non-admin users must be a member of the registration group
		if (!req.user.isStaff && !req.user.isSuperuser) {
			const slot = await this.registrationService.findSlotById(request.sourceSlotIds[0])
			if (!slot.registrationId) {
				throw new ForbiddenException("Slot is not part of a registration")
			}
			await this.registrationService.findRegistrationById(slot.registrationId, req.user.playerId)
		}

		return this.adminRegisterService.movePlayers(eventId, request)
	}

	@Post(":eventId/swap-players")
	async swapPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: SwapPlayersRequest,
	): Promise<SwapPlayersResponse> {
		this.logger.log(
			`Swapping player ${request.playerAId} in slot ${request.slotAId} with player ${request.playerBId} in slot ${request.slotBId} for event ${eventId}`,
		)
		return this.adminRegisterService.swapPlayers(eventId, request)
	}

	@Post(":registrationId/update-notes")
	async updateNotes(
		@Param("registrationId", ParseIntPipe) registrationId: number,
		@Body() request: UpdateNotesRequest,
	): Promise<{ success: boolean }> {
		this.logger.log(`Updating notes for registration ${registrationId}`)
		await this.adminRegisterService.updateNotes(registrationId, request.notes)
		return { success: true }
	}

	@Post("refund")
	async processRefunds(@Body() refundRequests: RefundRequest[]) {
		const issuerId = 1 // TODO: change issuer to a string
		await this.refundService.processRefunds(refundRequests, issuerId)
		return { success: true }
	}
}
