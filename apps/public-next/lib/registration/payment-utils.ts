import type { EventFee } from "../types"
import type { PaymentAmount, ServerPaymentDetail } from "./types"

const transactionFixedCost = 0.3
const transactionPercentage = 0.029

export const NoAmount: PaymentAmount = {
	subtotal: 0,
	transactionFee: 0,
	total: 0,
}

export function calculateAmountDue(
	details: ServerPaymentDetail[],
	eventFees?: Map<number, EventFee>,
): PaymentAmount {
	if (details.length === 0 || !eventFees) return NoAmount

	const subtotal = details.reduce((sum, detail) => sum + (detail.amount ?? 0), 0)
	if (subtotal === 0) return NoAmount

	const total = (subtotal + transactionFixedCost) / (1.0 - transactionPercentage)
	const transactionFee = total - subtotal
	return { subtotal, transactionFee, total }
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	}).format(amount)
}
