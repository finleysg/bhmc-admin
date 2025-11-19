import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common"
import type { AddAdminRegistration, RegisteredPlayer, SearchPlayers } from "@repo/domain/types"

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

	@Get(":eventId/groups")
	@UseGuards(JwtAuthGuard)
	async searchGroups(@Param("eventId") eventId: string, @Query() query: SearchPlayers) {
		return this.registrationService.searchGroups(+eventId, query.searchText!)
	}

	@Post(":eventId")
	@UseGuards(JwtAuthGuard)
	async createAdminRegistration(
		@Param("eventId") eventId: string,
		@Body() dto: AddAdminRegistration,
	) {
		return this.registrationService.createAdminRegistration(+eventId, dto)
	}

	@Get(":eventId/players")
	async getRegisteredPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<RegisteredPlayer[]> {
		return await this.registrationService.getRegisteredPlayers(eventId)
	}
}
