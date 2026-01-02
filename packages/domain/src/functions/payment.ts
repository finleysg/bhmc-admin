import { AmountDue, EventFee, FeeRestrictionChoices, Player, CompletePayment } from "../types"
import { getAge } from "./player"

const SENIOR_AGE = 62
const STRIPE_PERCENTAGE_FEE = 0.029
const STRIPE_FIXED_FEE = 0.3

/**
 * Format a dollar amount as US currency
 * @param amount - Dollar amount in dollars (decimal)
 * @returns - Dollar amount formatted as US currency
 */
export function formatCurrency(amount: number) {
	const rounded = Math.round(amount * 100) / 100
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(rounded)
}

/**
 * Calculate transaction fee using Stripe-like formula: 2.9% + $0.30
 * If the amount is 0, the fee is also 0.
 * @param amount - The payment amount in dollars
 * @returns The calculated transaction fee
 */
export function calculateTransactionFee(amount: number): number {
	if (amount < 0 || !Number.isFinite(amount)) {
		throw new Error(`Transaction amount (${amount}) must be a non-negative finite number`)
	}
	if (amount === 0) return 0
	return Math.round((amount * STRIPE_PERCENTAGE_FEE + STRIPE_FIXED_FEE) * 100) / 100
}

/**
 * Calculate the total amount due including transaction fees
 * @param amounts - An array of fees as decimals
 */
export function calculateAmountDue(amounts: number[]): AmountDue {
	const subtotal = amounts.reduce((sum, fee) => sum + fee, 0)
	const transactionFee = calculateTransactionFee(subtotal)
	const total = Math.round((subtotal + transactionFee) * 100) / 100

	return {
		subtotal,
		transactionFee,
		total,
	}
}

/**
 * We support two override types for event fees: "member" and "senior"
 * This function returns the correct amount based on the player's status
 * @param eventFee - The event fee object
 * @param player - The player object
 * @returns The correct amount for the player
 */
export function getAmount(eventFee: EventFee, player: Player, eventDate?: Date): number {
	if (!eventFee.overrideAmount) {
		return eventFee.amount
	}

	if (eventFee.overrideRestriction === FeeRestrictionChoices.MEMBERS && player.isMember) {
		return eventFee.overrideAmount
	}

	if (eventFee.overrideRestriction === FeeRestrictionChoices.SENIORS) {
		const age = getAge(player, new Date(), eventDate)
		if (+age.eventAge >= SENIOR_AGE) {
			return eventFee.overrideAmount
		}
	}

	return eventFee.amount
}

/**
 * Calculate the total amount due for a specific player based on selected event fees
 * @param player - The player for whom to calculate amount due
 * @param eventFees - The fees selected for this player
 * @param eventDate - An optional event date for deriving senior rates
 * @returns
 */
export function getTotalAmountForPlayer(
	player: Player,
	eventFees: EventFee[],
	eventDate?: Date,
): AmountDue {
	const feeAmounts = eventFees.map((fee) => {
		return getAmount(fee, player, eventDate)
	})
	return calculateAmountDue(feeAmounts)
}

export function getRequiredFees(payment: CompletePayment): number {
	let amount = 0
	payment.details.forEach((detail) => {
		if (detail.eventFee.isRequired) {
			amount += detail.amount
		}
	})
	return amount
}

export function getOptionalFees(payment: CompletePayment): number {
	let amount = 0
	payment.details.forEach((detail) => {
		if (!detail.eventFee.isRequired) {
			amount += detail.amount
		}
	})
	return amount
}
