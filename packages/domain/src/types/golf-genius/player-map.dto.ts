/**
 * DTO representing player data needed for Golf Genius integration operations.
 */
export interface PlayerRecord {
	id: number
	firstName: string
	lastName: string
	email: string
	phone?: string
}

/**
 * Map of Golf Genius member IDs to player records for efficient lookups.
 */
export type PlayerMap = Map<string, PlayerRecord>
