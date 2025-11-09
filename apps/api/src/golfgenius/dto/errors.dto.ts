/**
 * Error types for Golf Genius integration operations
 */

export interface ExportError {
	slotId?: number
	playerId?: number
	email?: string
	error: string
}

export interface ImportError {
	itemId?: string
	itemName?: string
	error: string
}
