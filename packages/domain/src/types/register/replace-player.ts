/**
 * Request model for replacing a player in a registration slot.
 */
export interface ReplacePlayerRequest {
	slotId: number
	originalPlayerId: number
	replacementPlayerId: number
	notes?: string | null
}

/**
 * Response model for replacing a player in a registration slot.
 */
export interface ReplacePlayerResponse {
	slotId: number
	greenFeeDifference?: number | null
}
