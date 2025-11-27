/**
 * Calculate transaction fee using Stripe-like formula: 2.9% + $0.30
 * If the amount is 0, the fee is also 0.
 * @param amount - The payment amount in dollars
 * @returns The calculated transaction fee
 */
export function calculateTransactionFee(amount: number): number {
	if (amount === 0) return 0
	return amount * 0.029 + 0.3
}
