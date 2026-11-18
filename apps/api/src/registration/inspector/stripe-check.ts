import type Stripe from "stripe"

import type { StripeCheck } from "@repo/domain/types"

import type { PaymentRow, RefundRow } from "../../database"

const cents = (amount: string | number) => Math.round(Number(amount) * 100)
const dollars = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`

export const isPaymentIntentId = (code: string) => code.startsWith("pi_")
export const isStripeRefundId = (code: string) => code.startsWith("re_")

export const notStripe: StripeCheck = {
	result: "not-stripe",
	stripeStatus: null,
	stripeAmount: null,
	issues: [],
}

export function stripeError(error: unknown): StripeCheck {
	return {
		result: "error",
		stripeStatus: null,
		stripeAmount: null,
		issues: [error instanceof Error ? error.message : String(error)],
	}
}

function check(stripeStatus: string, amountCents: number, issues: string[]): StripeCheck {
	return {
		result: issues.length ? "mismatch" : "ok",
		stripeStatus,
		stripeAmount: amountCents / 100,
		issues,
	}
}

/**
 * Compares a payment with its PaymentIntent. Stripe charges the payment amount plus the
 * transaction fee. An unconfirmed payment Stripe never collected is normal (an abandoned
 * checkout), so only disagreement is flagged.
 */
export function checkPayment(
	row: PaymentRow,
	refunds: RefundRow[],
	intent: Stripe.PaymentIntent,
): StripeCheck {
	const issues: string[] = []
	const succeeded = intent.status === "succeeded"
	if (succeeded && !row.confirmed) issues.push("Paid in Stripe but not confirmed in the database")
	if (!succeeded && row.confirmed) {
		issues.push(`Confirmed in the database but Stripe status is ${intent.status}`)
	}

	const expected = cents(row.paymentAmount) + cents(row.transactionFee)
	if (intent.amount !== expected) {
		issues.push(
			`Stripe amount ${dollars(intent.amount)}; database ${dollars(expected)} (payment plus transaction fee)`,
		)
	}

	const charge = intent.latest_charge
	const stripeRefunded = charge && typeof charge !== "string" ? charge.amount_refunded : 0
	const dbRefunded = refunds.reduce((total, r) => total + cents(r.refundAmount), 0)
	if (stripeRefunded !== dbRefunded) {
		issues.push(
			`Stripe refunded ${dollars(stripeRefunded)}; database refunds total ${dollars(dbRefunded)}`,
		)
	}

	return check(intent.status, intent.amount, issues)
}

/** Compares a refund with Stripe's. */
export function checkRefund(row: RefundRow, stripeRefund: Stripe.Refund): StripeCheck {
	const issues: string[] = []
	const succeeded = stripeRefund.status === "succeeded"
	if (succeeded && !row.confirmed)
		issues.push("Refunded in Stripe but not confirmed in the database")
	if (!succeeded && row.confirmed) {
		issues.push(`Confirmed in the database but Stripe status is ${stripeRefund.status}`)
	}
	if (stripeRefund.amount !== cents(row.refundAmount)) {
		issues.push(
			`Stripe amount ${dollars(stripeRefund.amount)}; database ${dollars(cents(row.refundAmount))}`,
		)
	}
	return check(stripeRefund.status ?? "unknown", stripeRefund.amount, issues)
}

/** A refund of a Stripe payment whose code is not a Stripe refund ID never reached Stripe. */
export const refundNotSent: StripeCheck = {
	result: "mismatch",
	stripeStatus: null,
	stripeAmount: null,
	issues: ["No Stripe refund ID: the refund was not sent to Stripe, or its ID was not saved"],
}
