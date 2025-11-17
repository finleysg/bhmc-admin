import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common"
import {
	AddAdminRegistrationDto,
	EventRegistrationSummaryDto,
	SearchPlayersDto,
} from "@repo/domain/types"

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

	@Get(":eventId/players/search")
	@UseGuards(JwtAuthGuard)
	async searchEventPlayers(@Param("eventId") eventId: string, @Query() query: SearchPlayersDto) {
		const dto = {
			searchText: query.searchText,
			includeGroup: query.includeGroup ?? true,
		}
		return this.registrationService.searchEventPlayers(+eventId, dto)
	}

	@Post(":eventId")
	@UseGuards(JwtAuthGuard)
	async createAdminRegistration(
		@Param("eventId") eventId: string,
		@Body() dto: AddAdminRegistrationDto,
	) {
		return this.registrationService.createAdminRegistration(+eventId, dto)
	}

	@Get(":eventId/players")
	async getRegisteredPlayers(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<EventRegistrationSummaryDto> {
		const transformed = await this.registrationService.getPlayers(eventId)

		// Sort by team column (alpha-numeric)
		transformed.sort((a, b) => {
			const teamA = String(a.team ?? "")
			const teamB = String(b.team ?? "")
			return teamA.localeCompare(teamB, undefined, { numeric: true })
		})

		return { eventId, total: transformed.length, slots: transformed }
	}
}
