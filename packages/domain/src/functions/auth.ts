import { ADMIN_ROLE_GROUPS, AdminRole, DjangoUserResponse, DjangoUser } from "../types"

// Helper function to transform API response
export function transformDjangoUser(response: DjangoUserResponse): DjangoUser {
	return {
		id: response.id,
		email: response.email,
		firstName: response.first_name,
		lastName: response.last_name,
		isActive: response.is_active,
		isStaff: response.is_staff,
		isSuperuser: response.is_superuser,
		ghin: response.ghin,
		birthDate: response.birth_date,
		playerId: response.player_id,
		groups: response.groups.map((g) => g.name),
	}
}

/** True if the user holds any of the roles. Superusers hold every role. */
export function hasAdminRole(user: DjangoUser, roles: AdminRole[]): boolean {
	if (user.isSuperuser) return true
	return roles.some((role) => user.groups.includes(ADMIN_ROLE_GROUPS[role]))
}
