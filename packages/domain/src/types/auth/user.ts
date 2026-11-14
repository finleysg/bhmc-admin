export interface DjangoUserResponse {
	id: number
	email: string
	first_name: string
	last_name: string
	is_active: boolean
	is_staff: boolean
	is_superuser: boolean
	ghin: string | null
	birth_date: string | null
	player_id: number
	groups: { name: string }[]
}

export interface DjangoUser {
	id: number
	email: string
	firstName: string
	lastName: string
	isActive: boolean
	isStaff: boolean
	isSuperuser: boolean
	ghin: string | null
	birthDate: string | null
	playerId: number
	/** Django auth group names */
	groups: string[]
}

/** Admin roles, each backed by a Django auth group (ADR 0003). */
export type AdminRole = "event-admin" | "club-admin"

export const ADMIN_ROLE_GROUPS: Record<AdminRole, string> = {
	"event-admin": "Event Admin",
	"club-admin": "Club Admin",
}
