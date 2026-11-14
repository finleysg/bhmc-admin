import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import { ADMIN_ROLE_GROUPS, AdminRole, PlayerAdminRoles } from "@repo/domain/types"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { AuditService, type AuditContext } from "../audit"
import { DrizzleService } from "../database"

import { PlayerRolesRepository } from "./player-roles.repository"

const ROLES = Object.keys(ADMIN_ROLE_GROUPS) as AdminRole[]

@Injectable()
export class PlayerRolesService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(PlayerRolesRepository) private readonly repository: PlayerRolesRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	async getRoles(playerId: number): Promise<PlayerAdminRoles> {
		const { userId, isSuperuser } = await this.findAccount(playerId)
		return { roles: await this.rolesOf(userId), isSuperuser }
	}

	/**
	 * Replaces the player's admin roles. Other Django groups are left alone.
	 * The change and its audit entry are written in one transaction.
	 */
	async setRoles(
		playerId: number,
		roles: unknown,
		context: AuditContext,
	): Promise<PlayerAdminRoles> {
		if (!Array.isArray(roles) || !roles.every((r) => ROLES.includes(r as AdminRole))) {
			throw new BadRequestException(`roles must be a list of: ${ROLES.join(", ")}`)
		}
		const requested = [...new Set(roles as AdminRole[])].sort()
		const { userId } = await this.findAccount(playerId)

		await this.drizzle.db.transaction(async (tx) => {
			// Lock first: a plain read here is a snapshot and can miss a concurrent change.
			await this.repository.lockUser(tx, userId)
			const before = await this.rolesOf(userId, tx)
			await this.repository.replaceMemberships(
				tx,
				userId,
				ROLES.map((role) => ADMIN_ROLE_GROUPS[role]),
				requested.map((role) => ADMIN_ROLE_GROUPS[role]),
			)
			await this.audit.record(tx, context, {
				operation: "player.roles.update",
				entityType: "player",
				entityId: playerId,
				before: { roles: before },
				after: { roles: requested },
			})
		})
		return this.getRoles(playerId)
	}

	private async rolesOf(userId: number, db?: MySql2Database): Promise<AdminRole[]> {
		const groups = await this.repository.findGroupNames(userId, db)
		return ROLES.filter((role) => groups.includes(ADMIN_ROLE_GROUPS[role])).sort()
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
