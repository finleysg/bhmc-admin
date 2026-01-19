/**
 * Request model for swapping two players between different registration slots.
 */
export interface SwapPlayersRequest {
	slotAId: number
	playerAId: number
	slotBId: number
	playerBId: number
	notes?: string
}

/**
 * Response model for swapping two players between different registration slots.
 */
export interface SwapPlayersResponse {
	swappedCount: 2
	playerAName: string
	playerBName: string
}
