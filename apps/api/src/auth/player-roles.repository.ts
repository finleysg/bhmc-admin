import { and, eq, inArray } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import { authGroup, authUser, authUserGroups, DrizzleService, player } from "../database"

@Injectable()
export class PlayerRolesRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	/** The player's login account, or `undefined` if the player does not exist. */
	async findPlayerUser(
		playerId: number,
	): Promise<{ userId: number | null; isSuperuser: boolean } | undefined> {
		const [row] = await this.drizzle.db
			.select({ userId: player.userId, isSuperuser: authUser.isSuperuser })
			.from(player)
			.leftJoin(authUser, eq(authUser.id, player.userId))
			.where(eq(player.id, playerId))
			.limit(1)
		if (!row) return undefined
		return { userId: row.userId, isSuperuser: Boolean(row.isSuperuser) }
	}

	/**
	 * Locks the user's auth_user row (SELECT … FOR UPDATE) for the rest of `tx`,
	 * so concurrent role changes for one user run one at a time.
	 */
	async lockUser(tx: MySql2Database, userId: number): Promise<void> {
		await tx.select({ id: authUser.id }).from(authUser).where(eq(authUser.id, userId)).for("update")
	}

	async findGroupNames(userId: number, db: MySql2Database = this.drizzle.db): Promise<string[]> {
		const rows = await db
			.select({ name: authGroup.name })
			.from(authUserGroups)
			.innerJoin(authGroup, eq(authGroup.id, authUserGroups.groupId))
			.where(eq(authUserGroups.userId, userId))
		return rows.map((r) => r.name)
	}

	/**
	 * Makes the user's membership among `managedGroups` exactly `memberOf`.
	 * Groups outside `managedGroups` are not touched. Run it inside a transaction.
	 */
	async replaceMemberships(
		tx: MySql2Database,
		userId: number,
		managedGroups: string[],
		memberOf: string[],
	): Promise<void> {
		const groups = await tx.select().from(authGroup).where(inArray(authGroup.name, managedGroups))
		if (groups.length !== managedGroups.length) {
			throw new Error(`Missing admin groups; expected ${managedGroups.join(", ")}`)
		}

		await tx.delete(authUserGroups).where(
			and(
				eq(authUserGroups.userId, userId),
				inArray(
					authUserGroups.groupId,
					groups.map((g) => g.id),
				),
			),
		)

		const toAdd = groups.filter((g) => memberOf.includes(g.name))
		if (toAdd.length > 0) {
			await tx.insert(authUserGroups).values(toAdd.map((g) => ({ userId, groupId: g.id })))
		}
	}
}
