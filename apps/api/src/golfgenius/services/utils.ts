/**
 * Utility functions for Golf Genius integration
 */

/**
 * Parses a currency string into a number value.
 *
 * This function handles various currency formats including dollar signs,
 * commas, and whitespace. It validates the format and ensures only positive,
 * valid numeric amounts are returned. Invalid formats (multiple decimals,
 * trailing decimals, NaN values) trigger warnings.
 *
 * @param purseStr - The currency string to parse (e.g., "$123.45", "1,234.56", "   $100")
 * @returns The parsed amount as a positive number, or null if invalid/parsing fails
 *
 * @example
 * parsePurseAmount("$123.45") // returns 123.45
 * parsePurseAmount("1,234.56") // returns 1234.56
 * parsePurseAmount("") // returns null
 */
/**
 * Parses a leaderboard position string into a number.
 *
 * Golf Genius reports ties with a "T" prefix (e.g. "T4" for a tie for 4th).
 *
 * @param positionStr - The position string to parse (e.g., "4", "T4")
 * @returns The numeric position, or 0 if missing/unparseable
 */
export function parsePosition(positionStr: string | undefined | null): number {
	if (!positionStr) return 0

	const cleaned = positionStr.trim().replace(/^T/i, "")
	const position = parseInt(cleaned, 10)
	return isNaN(position) ? 0 : position
}

export function parsePurseAmount(purseStr: string | undefined | null): number | null {
	if (!purseStr || purseStr.trim() === "") return null

	const cleaned = purseStr.replace(/[$,]/g, "").trim()
	if (!cleaned) return null

	if (cleaned.endsWith(".")) {
		throw new Error("Invalid purse amount")
	}

	if ((cleaned.match(/\./g) || []).length > 1) {
		throw new Error("Invalid purse amount")
	}

	const amount = parseFloat(cleaned)
	if (isNaN(amount)) {
		throw new Error("Invalid purse amount")
	}
	return amount > 0 ? amount : null
}
