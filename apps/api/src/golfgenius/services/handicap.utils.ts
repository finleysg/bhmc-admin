/**
 * Utility functions for handicap calculations
 */

/**
 * Parses a handicap index string into a number.
 *
 * Golf handicap indexes can be positive (most players) or "plus" handicaps
 * (better-than-scratch players). Plus handicaps are indicated by a leading
 * '+' character and represent a negative value in calculations.
 *
 * @param handicapIndex - The handicap index string (e.g., "6.7", "+2.3", "")
 * @returns The parsed handicap as a number, or null if empty/invalid
 *
 * @example
 * parseHandicapIndex("6.7")   // returns 6.7
 * parseHandicapIndex("+2.3")  // returns -2.3 (plus handicap)
 * parseHandicapIndex("")      // returns null
 * parseHandicapIndex("  ")    // returns null
 */
export function parseHandicapIndex(handicapIndex: string | undefined | null): number | null {
	if (!handicapIndex || handicapIndex.trim() === "") return null

	const trimmed = handicapIndex.trim()

	// Plus handicaps start with '+' and represent negative values
	if (trimmed.startsWith("+")) {
		const value = parseFloat(trimmed.slice(1))
		return isNaN(value) ? null : -value
	}

	const value = parseFloat(trimmed)
	return isNaN(value) ? null : value
}
