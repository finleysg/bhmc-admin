import type { RegistrationStatusValue } from "./choices"

/** A registration of the event, found by the inspector's search. */
export interface InspectorSearchResult {
	registrationId: number
	signedUpBy: string | null
	createdDate: string
	/** Players currently on the registration's slots. */
	players: string[]
}

/**
 * The live Stripe check of one payment or refund: "ok" when Stripe agrees with the
 * database, "mismatch" with the differences, "not-stripe" for payments recorded outside
 * Stripe (cash, waived, ...), and "error" when Stripe could not be reached.
 */
export interface StripeCheck {
	result: "ok" | "mismatch" | "not-stripe" | "error"
	/** Stripe's status, e.g. "succeeded", "requires_payment_method". */
	stripeStatus: string | null
	/** Stripe's amount in dollars. */
	stripeAmount: number | null
	/** Each difference from the database, or the error. */
	issues: string[]
}

export interface InspectedFee {
	id: number
	eventFeeId: number
	feeTypeName: string
	amount: number
	isPaid: boolean
	paymentId: number
}

export interface InspectedSlot {
	id: number
	status: RegistrationStatusValue
	playerId: number | null
	playerName: string | null
	holeNumber: number | null
	startingOrder: number
	slot: number
	sessionName: string | null
	fees: InspectedFee[]
}

export interface InspectedRefund {
	id: number
	refundCode: string
	amount: number
	confirmed: boolean
	refundDate: string | null
	notes: string | null
	stripe: StripeCheck
}

export interface InspectedPayment {
	id: number
	paymentCode: string
	paymentKey: string | null
	amount: number
	transactionFee: number
	confirmed: boolean
	paymentDate: string | null
	confirmDate: string | null
	refunds: InspectedRefund[]
	stripe: StripeCheck
	/** The PaymentIntent in the Stripe dashboard; null for payments recorded outside Stripe. */
	stripeUrl: string | null
}

export interface InspectedChange {
	id: number
	action: string
	actorName: string
	isAdmin: boolean
	details: unknown
	createdDate: string
}

/** An event fee that can be added to a slot. */
export interface InspectorEventFee {
	id: number
	feeTypeName: string
	amount: number
	isRequired: boolean
}

/** Everything about one registration needed to diagnose it. */
export interface RegistrationInspection {
	id: number
	eventId: number
	eventName: string
	/** "YYYY-MM-DD" */
	startDate: string
	canChoose: boolean
	courseName: string | null
	userId: number | null
	signedUpBy: string | null
	createdDate: string
	/** When a pending hold expires. */
	expires: string | null
	/** The hold has expired while a slot is still Pending or Awaiting payment. */
	holdExpired: boolean
	notes: string | null
	slots: InspectedSlot[]
	/**
	 * Payments for this registration's fees, and any other payment by the registering
	 * user for the event (for example a payment whose fees were detached by a drop).
	 */
	payments: InspectedPayment[]
	changeLog: InspectedChange[]
	eventFees: InspectorEventFee[]
}

/** Slot statuses the inspector can set. */
export type InspectorSlotStatus = "R" | "A" | "U"

export interface SlotStatusRequest {
	status: InspectorSlotStatus
}

/**
 * Adds a fee to a slot, recorded as paid outside Stripe, or waived (recorded at $0, so it
 * adds nothing to the money collected).
 */
export type AddFeeRequest =
	| { eventFeeId: number; waived: true }
	| {
			eventFeeId: number
			waived?: false
			/** How it was paid, e.g. "Cash", "Check", "Venmo". Becomes the payment code. */
			paidBy: string
	  }
