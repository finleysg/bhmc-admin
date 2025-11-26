import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common"
import type {
	AddAdminRegistration,
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

	@Post(":eventId")
	@UseGuards(JwtAuthGuard)
	async createAdminRegistration(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() dto: AddAdminRegistration,
	) {
		return this.registrationService.createAdminRegistration(+eventId, dto)
	}

	@Get(":eventId/players")
	async getRegisteredPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<ValidatedRegisteredPlayer[]> {
		return await this.registrationService.getRegisteredPlayers(eventId)
	}

	@Get(":eventId/available-slots")
	async getAvailableSlots(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("courseId", ParseIntPipe) courseId: number,
		@Query("players", ParseIntPipe) players: number,
	): Promise<AvailableSlotGroup[]> {
		return await this.registrationService.getAvailableSlots(eventId, courseId, players)
	}
}
