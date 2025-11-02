export interface RegistrationDto {
	id?: number
	expires?: string | null
	startingHole: number
	startingOrder: number
	notes?: string | null
	courseId?: number | null
	eventId: number
	signedUpBy?: string | null
	userId?: number | null
	createdDate: string
	ggId?: string | null
}
