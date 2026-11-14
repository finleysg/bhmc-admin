import { Body, Controller, Get, Inject, Param, ParseIntPipe, Put } from "@nestjs/common"
import type { PlayerAdminRoles } from "@repo/domain/types"

import { ClubAdmin } from "./decorators"
import { PlayerRolesService } from "./player-roles.service"

/** Admin role membership, managed from club player management (ADR 0003). */
@Controller("players")
@ClubAdmin()
export class PlayerRolesController {
	constructor(@Inject(PlayerRolesService) private readonly service: PlayerRolesService) {}

	@Get(":playerId/roles")
	async getRoles(@Param("playerId", ParseIntPipe) playerId: number): Promise<PlayerAdminRoles> {
		return this.service.getRoles(playerId)
	}

	@Put(":playerId/roles")
	async setRoles(
		@Param("playerId", ParseIntPipe) playerId: number,
		@Body() body: { roles?: unknown },
	): Promise<PlayerAdminRoles> {
		return this.service.setRoles(playerId, body?.roles)
	}
}
