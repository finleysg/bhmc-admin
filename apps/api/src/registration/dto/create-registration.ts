/**
 * Request model for creating a registration: aka "reserve".
 */

export interface CreateRegistration {
	event: number
	course?: number | null
	slots: number[]
}
