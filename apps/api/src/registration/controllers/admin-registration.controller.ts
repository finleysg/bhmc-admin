import {
	Body,
	Controller,
	Get,
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
		private readonly adminRegistrationService: AdminRegistrationService,
		private readonly adminRegisterService: PlayerService,
		private readonly refundService: RefundService,
	) {}

	@Get("players")
	async playerQuery(@Query() query: PlayerQuery) {
		const obj: PlayerQuery = {
			searchText: query.searchText,
			isMember: query.isMember ?? true,
			eventId: query.eventId ? Number(query.eventId) : undefined,
			excludeRegistered: query.excludeRegistered ?? true,
		}
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

	@Post("refund")
	async processRefunds(@Body() refundRequests: RefundRequest[]) {
		const issuerId = 1 // TODO: change issuer to a string
		await this.refundService.processRefunds(refundRequests, issuerId)
		return { success: true }
	}
}
