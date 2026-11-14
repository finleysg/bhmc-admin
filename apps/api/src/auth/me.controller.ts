import { Controller, Get, Req } from "@nestjs/common"
import { hasAdminRole } from "@repo/domain/functions"
import { ADMIN_ROLE_GROUPS, type AdminRole } from "@repo/domain/types"

import type { AuthenticatedRequest } from "."

export interface CurrentUser {
	id: number
	email: string
	name: string
	isSuperuser: boolean
	/** Admin roles in effect; a superuser holds them all. */
	roles: AdminRole[]
}

/** The signed-in user, for clients such as the CLI's `whoami`. */
@Controller("me")
export class MeController {
	@Get()
	me(@Req() req: AuthenticatedRequest): CurrentUser {
		const { user } = req
		return {
			id: user.id,
			email: user.email,
			name: `${user.firstName} ${user.lastName}`.trim(),
			isSuperuser: user.isSuperuser,
			roles: (Object.keys(ADMIN_ROLE_GROUPS) as AdminRole[])
				.filter((role) => hasAdminRole(user, [role]))
				.sort(),
		}
	}
}
