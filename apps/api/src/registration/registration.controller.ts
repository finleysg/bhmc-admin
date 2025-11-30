import {
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	UseGuards,
} from "@nestjs/common"
import type {
	AdminRegistration,
	AvailableSlotGroup,
	SearchPlayers,
	ValidatedRegisteredPlayer,
} from "@repo/domain/types"

import { JwtAuthGuard } from "../auth/jwt.guard"
import { RegistrationService } from "./registration.service"

@Controller("registration")
export class RegistrationController {
	constructor(private readonly registrationService: RegistrationService) {}

	@Get("players")
	@UseGuards(JwtAuthGuard)
	async searchPlayers(@Query() query: SearchPlayers) {
		const dto = {
			searchText: query.searchText,
			isMember: query.isMember ?? true,
		}
		return this.registrationService.searchPlayers(dto)
	}

	@Get(":eventId/groups/:playerId")
	@UseGuards(JwtAuthGuard)
	async getGroup(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("playerId", ParseIntPipe) playerId: number,
	) {
		return this.registrationService.findGroup(eventId, playerId)
	}

	@Put(":eventId/admin-registration/:registrationId")
	@UseGuards(JwtAuthGuard)
	async completeAdminRegistration(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("registrationId", ParseIntPipe) registrationId: number,
		@Body() dto: AdminRegistration,
	) {
		const paymentId = await this.registrationService.completeAdminRegistration(
			eventId,
			registrationId,
			dto,
		)
		if (dto.collectPayment && paymentId > 0) {
			// TODO: Trigger payment request email
		}
		return { paymentId }
	}

	@Get(":eventId/players")
	@UseGuards(JwtAuthGuard)
	async getRegisteredPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<ValidatedRegisteredPlayer[]> {
		return await this.registrationService.getRegisteredPlayers(eventId)
	}

	@Get(":eventId/available-slots")
	@UseGuards(JwtAuthGuard)
	async getAvailableSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("courseId", ParseIntPipe) courseId: number,
		@Query("players", ParseIntPipe) players: number,
	): Promise<AvailableSlotGroup[]> {
		return await this.registrationService.getAvailableSlots(eventId, courseId, players)
	}

	@Get(":eventId/groups/search")
	@UseGuards(JwtAuthGuard)
	async searchGroups(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("searchText") searchText: string,
	) {
		return this.registrationService.findGroups(eventId, searchText)
	}

	@Post(":eventId/reserve-admin-slots")
	@UseGuards(JwtAuthGuard)
	async reserveAdminSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() slotIds: number[],
	) {
		return this.registrationService.reserveSlots(eventId, slotIds)
	}
}
