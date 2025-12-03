import { PlayerFees } from "@/types/event-fee"
import { ValidatedEventFee, ValidatedRegistrationSlot } from "@repo/domain/types"

/**
 * Convert validated registration slots and event fee definitions into per-player fee summaries.
 *
 * @param slots - Validated registration slots to convert into player fee entries
 * @param eventFees - Event fee definitions to map onto each slot
 * @returns An array of PlayerFees where each element contains a player's id, name, mapped fees (with selection, amount, and registration association) and a subtotal of selected fees
 */
export function convertSlotsToPlayerFees(
	slots: ValidatedRegistrationSlot[],
	eventFees: ValidatedEventFee[],
): PlayerFees[] {
	const playerFees: PlayerFees[] = []

	for (const slot of slots) {
		const item = {
			playerId: slot.player.id,
			playerName: `${slot.player.firstName} ${slot.player.lastName}`,
			fees: eventFees.map((fee) => {
				const registrationFee = slot.fees
					.filter((f) => f.isPaid)
					.find((f) => f.eventFeeId === fee.id)
				return {
					id: fee.id,
					eventId: fee.eventId,
					isRequired: fee.isRequired,
					displayOrder: fee.displayOrder,
					code: fee.feeType.code,
					name: fee.feeType.name,
					registrationFeeId: registrationFee?.id,
					amount: registrationFee?.amount ? +registrationFee.amount : +fee.amount,
					isSelected: registrationFee ? true : false,
					canChange: registrationFee ? true : false,
				}
			}),
			subtotal: 0,
		}
		item.subtotal = item.fees.reduce((sum, fee) => {
			return fee.isSelected ? fee.amount + sum : sum
		}, 0)
		playerFees.push(item)
	}

	return playerFees
}
