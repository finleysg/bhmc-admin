const STRIPE_PERCENTAGE_FEE = 0.029
const STRIPE_FIXED_FEE = 0.3

/**
 * Calculate transaction fee using Stripe-like formula: 2.9% + $0.30
 * If the amount is 0, the fee is also 0.
 * @param amount - The payment amount in dollars
 * @returns The calculated transaction fee
 */
export function calculateTransactionFee(amount: number): number {
	if (amount < 0 || !Number.isFinite(amount)) {
		throw new Error("Transaction amount must be a non-negative finite number")
	}
	if (amount === 0) return 0
	return Math.round((amount * STRIPE_PERCENTAGE_FEE + STRIPE_FIXED_FEE) * 100) / 100
}
