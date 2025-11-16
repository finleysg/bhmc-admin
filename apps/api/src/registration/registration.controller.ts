import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { SearchPlayersDto } from "@repo/dto"

import { JwtAuthGuard } from "../auth/jwt.guard"
import { RegistrationService } from "./registration.service"

@Controller("registration")
export class RegistrationController {
	constructor(private readonly registrationService: RegistrationService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	async searchPlayers(@Query() query: SearchPlayersDto) {
		const dto = {
			searchText: query.searchText,
			isMember: query.isMember ?? true,
		}
		return this.registrationService.searchPlayers(dto)
	}

	@Get(":eventId/players")
	@UseGuards(JwtAuthGuard)
	async searchEventPlayers(@Param("eventId") eventId: string, @Query() query: SearchPlayersDto) {
		const dto = {
			searchText: query.searchText,
			includeGroup: query.includeGroup ?? true,
		}
		return this.registrationService.searchEventPlayers(+eventId, dto)
	}
}
