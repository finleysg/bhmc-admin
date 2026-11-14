import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import { ADMIN_ROLE_GROUPS, AdminRole, PlayerAdminRoles } from "@repo/domain/types"

import { PlayerRolesRepository } from "./player-roles.repository"

const ROLES = Object.keys(ADMIN_ROLE_GROUPS) as AdminRole[]

@Injectable()
export class PlayerRolesService {
	constructor(@Inject(PlayerRolesRepository) private readonly repository: PlayerRolesRepository) {}

	async getRoles(playerId: number): Promise<PlayerAdminRoles> {
		const { userId, isSuperuser } = await this.findAccount(playerId)
		const groups = await this.repository.findGroupNames(userId)
		const roles = ROLES.filter((role) => groups.includes(ADMIN_ROLE_GROUPS[role])).sort()
		return { roles, isSuperuser }
	}

	/** Replaces the player's admin roles. Other Django groups are left alone. */
	async setRoles(playerId: number, roles: unknown): Promise<PlayerAdminRoles> {
		if (!Array.isArray(roles) || !roles.every((r) => ROLES.includes(r as AdminRole))) {
			throw new BadRequestException(`roles must be a list of: ${ROLES.join(", ")}`)
		}
		const { userId } = await this.findAccount(playerId)
		await this.repository.replaceMemberships(
			userId,
			ROLES.map((role) => ADMIN_ROLE_GROUPS[role]),
			(roles as AdminRole[]).map((role) => ADMIN_ROLE_GROUPS[role]),
		)
		return this.getRoles(playerId)
	}

	private async findAccount(playerId: number): Promise<{ userId: number; isSuperuser: boolean }> {
		const account = await this.repository.findPlayerUser(playerId)
		if (!account) {
			throw new NotFoundException(`Player ${playerId} not found`)
		}
		if (account.userId === null) {
			throw new ConflictException(`Player ${playerId} has no login account`)
		}
		return { userId: account.userId, isSuperuser: account.isSuperuser }
	}
}
