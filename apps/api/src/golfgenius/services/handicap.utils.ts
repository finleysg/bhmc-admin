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

/**
 * Calculates course par from hole par values.
 *
 * Sums all non-null par values from the array. Handles both 9-hole
 * courses (9 non-null values) and 18-hole courses (18 non-null values).
 *
 * @param parValues - Array of 18 par values (null for unplayed holes)
 * @returns Sum of non-null par values, or 0 if all null
 *
 * @example
 * calculateCoursePar([4,5,3,4,5,4,4,3,4,null,...]) // returns 36 (front 9)
 * calculateCoursePar([4,5,3,4,5,4,4,3,4,4,4,3,5,4,4,5,3,4]) // returns 72
 */
export function calculateCoursePar(parValues: (number | null)[]): number {
	return parValues.reduce<number>((sum, par) => sum + (par ?? 0), 0)
}
