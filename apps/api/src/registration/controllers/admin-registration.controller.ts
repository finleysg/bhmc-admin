import {
	Body,
	Controller,
	Get,
	Inject,
	Logger,
	Param,
	ParseIntPipe,
	Post,
	Query,
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
} from "@repo/domain/types"

import { Admin } from "../../auth"
import { AdminRegistrationService } from "../services/admin-registration.service"
import { PlayerService } from "../services/player.service"
import { RefundService } from "../services/refund.service"

@Controller("registration")
@Admin()
export class AdminRegistrationController {
	private readonly logger = new Logger(AdminRegistrationController.name)

	constructor(
		@Inject(AdminRegistrationService)
		private readonly adminRegistrationService: AdminRegistrationService,
		@Inject(PlayerService) private readonly adminRegisterService: PlayerService,
		@Inject(RefundService) private readonly refundService: RefundService,
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
	async getAvailableSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("courseId", ParseIntPipe) courseId: number,
		@Query("players", ParseIntPipe) players: number,
	): Promise<AvailableSlotGroup[]> {
		return await this.adminRegisterService.getAvailableSlots(eventId, courseId, players)
	}

	@Post(":eventId/reserve-admin-slots")
	async reserveAdminSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() slotIds: number[],
	) {
		return this.adminRegisterService.reserveSlots(eventId, slotIds)
	}

	@Post(":registrationId/drop-players")
	async dropPlayers(
		@Param("registrationId", ParseIntPipe) registrationId: number,
		@Body() slotIds: number[],
	) {
		const droppedCount = await this.adminRegisterService.dropPlayers(registrationId, slotIds)
		return { droppedCount }
	}

	@Post(":eventId/replace-player")
	async replacePlayer(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: ReplacePlayerRequest,
	): Promise<ReplacePlayerResponse> {
		this.logger.log(
			`Replacing player ${request.originalPlayerId} with ${request.replacementPlayerId} in slot ${request.slotId} for event ${eventId}`,
		)
		return this.adminRegisterService.replacePlayer(eventId, request)
	}

	@Post(":eventId/move-players")
	async movePlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() request: MovePlayersRequest,
	): Promise<MovePlayersResponse> {
		this.logger.log(
			`Moving ${request.sourceSlotIds.length} players to hole ${request.destinationStartingHoleId} order ${request.destinationStartingOrder} for event ${eventId}`,
		)
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
