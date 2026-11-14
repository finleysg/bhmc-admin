import { SetMetadata } from "@nestjs/common"
import type { AdminRole } from "@repo/domain/types"

export const ROLES_KEY = "roles"

/** Requires any one of the roles. `@Roles()` with none allows any authenticated user. */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles)

export const EventAdmin = () => Roles("event-admin")
export const ClubAdmin = () => Roles("club-admin")
