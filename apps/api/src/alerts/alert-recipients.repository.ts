import { and, eq, ne } from "drizzle-orm"

import { Inject, Injectable } from "@nestjs/common"

import { authGroup, authUser, authUserGroups, DrizzleService } from "../database"

@Injectable()
export class AlertRecipientsRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	/**
	 * Email addresses of active members of a Django group. Superusers are included
	 * only if they are members: holding every permission doesn't mean every alert.
	 */
	async emailsInGroup(groupName: string): Promise<string[]> {
		const rows = await this.drizzle.db
			.select({ email: authUser.email })
			.from(authUserGroups)
			.innerJoin(authGroup, eq(authGroup.id, authUserGroups.groupId))
			.innerJoin(authUser, eq(authUser.id, authUserGroups.userId))
			.where(and(eq(authGroup.name, groupName), eq(authUser.isActive, 1), ne(authUser.email, "")))
		return rows.map((r) => r.email)
	}
}
