export interface Player {
	id: number
	firstName: string
	lastName: string
	email: string
	phoneNumber?: string | null
	ghin?: string | null
	tee: string
	birthDate?: string | null
	isMember: boolean
	ggId?: string | null
	userId?: number | null
}
