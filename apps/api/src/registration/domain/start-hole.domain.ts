import { HoleDomainData, RegistrationSlotDomainData } from "./types"

/**
 * Calculate a shotgun starting hole string (e.g. "8B").
 *
 * Rules:
 * - `startingOrder` is 0 or 1 mapping to "A" or "B".
 * - `slot.holeId` must be provided and matched against the provided holes array.
 * - Returns `${holeNumber}${letter}`.
 */
export function calculateStartingHole(
	slot: RegistrationSlotDomainData,
	holes: HoleDomainData[],
): string {
	if (slot.holeId === null || slot.holeId === undefined) {
		throw new Error("Missing holeId on slot for shotgun start")
	}

	const hole = holes.find((h) => h.id === slot.holeId)
	if (!hole) {
		throw new Error(`Hole with id ${slot.holeId} not found in provided holes`)
	}

	const holeNumber = hole.holeNumber
	const order = slot.startingOrder
	if (order !== 0 && order !== 1) {
		throw new Error(`Invalid startingOrder: ${order}`)
	}
	const letter = order === 0 ? "A" : "B"
	return `${holeNumber}${letter}`
}
