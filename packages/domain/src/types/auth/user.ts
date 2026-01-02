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
}
