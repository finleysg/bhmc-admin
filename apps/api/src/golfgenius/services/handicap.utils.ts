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

/**
 * Calculates course handicap from handicap index and course data.
 *
 * Uses the USGA formula with adjustments for 9-hole play:
 * - 9-hole: (index/2) × (slope/113) + (rating - par)
 * - 18-hole: index × (slope/113) + (rating - par)
 *
 * Maintains full precision during calculation and rounds only at the end.
 *
 * @param index - The player's handicap index
 * @param slope - Course slope rating
 * @param rating - Course rating
 * @param par - Course par
 * @param isNineHole - Whether this is a 9-hole round
 * @returns Rounded course handicap
 *
 * @example
 * calculateCourseHandicap(6.7, 127, 35.9, 36, true)  // returns 4
 * calculateCourseHandicap(10, 127, 71.5, 72, false)  // returns 11
 */
export function calculateCourseHandicap(
	index: number,
	slope: number,
	rating: number,
	par: number,
	isNineHole: boolean,
): number {
	const adjustedIndex = isNineHole ? index / 2 : index
	const courseHandicap = adjustedIndex * (slope / 113) + (rating - par)
	const rounded = Math.round(courseHandicap)
	return rounded === 0 ? 0 : rounded // Normalize -0 to 0
}

/**
 * Distributes handicap strokes across holes based on stroke indices.
 *
 * Stroke index 1 = hardest hole (gets stroke first).
 * For handicaps > numHoles, cycles through again for additional strokes.
 * For negative handicaps (plus players), distributes negative strokes.
 *
 * @param courseHandicap - The player's course handicap (can be negative for plus handicaps)
 * @param strokeIndices - Array of stroke index values (1-18, lower = harder hole)
 * @returns Array of stroke counts per hole (same length as strokeIndices)
 *
 * @example
 * distributeStrokes(4, [1,5,8,9,6,4,2,3,7]) // returns [1,0,0,0,0,1,1,1,0]
 * distributeStrokes(12, [1,2,3,4,5,6,7,8,9]) // returns [2,2,2,1,1,1,1,1,1]
 * distributeStrokes(-2, [1,2,3,4,5,6,7,8,9]) // returns [-1,-1,0,0,0,0,0,0,0]
 */
export function distributeStrokes(
	courseHandicap: number,
	strokeIndices: (number | null)[],
): number[] {
	const result: number[] = new Array<number>(strokeIndices.length).fill(0)

	if (courseHandicap === 0) return result

	// Build list of valid holes with their indices, sorted by stroke index (hardest first)
	const validHoles: { position: number; strokeIndex: number }[] = []
	for (let i = 0; i < strokeIndices.length; i++) {
		const si = strokeIndices[i]
		if (si !== null) {
			validHoles.push({ position: i, strokeIndex: si })
		}
	}
	validHoles.sort((a, b) => a.strokeIndex - b.strokeIndex)

	const numValidHoles = validHoles.length
	if (numValidHoles === 0) return result

	const absHandicap = Math.abs(courseHandicap)
	const strokeValue = courseHandicap > 0 ? 1 : -1

	// Distribute strokes, cycling through holes for high handicaps
	for (let i = 0; i < absHandicap; i++) {
		const holeIndex = validHoles[i % numValidHoles].position
		result[holeIndex] += strokeValue
	}

	return result
}
