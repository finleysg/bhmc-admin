/**
 * Request model for creating a registration: aka "reserve".
 */
export class CreateRegistration {
	event!: number
	course?: number | null
	slots!: number[]
}
