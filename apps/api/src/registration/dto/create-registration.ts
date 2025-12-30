/**
 * Request model for creating a registration: aka "reserve".
 */
export interface ReserveRequest {
	eventId: number
	courseId?: number | null
	slotIds: number[]
}
