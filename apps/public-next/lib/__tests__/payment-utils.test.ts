import type { EventFee, FeeType } from "../types"
import { calculateAmountDue, formatCurrency, NoAmount } from "../registration/payment-utils"
import type { ServerPaymentDetail } from "../registration/types"

function makeFeeType(overrides: Partial<FeeType> = {}): FeeType {
	return { id: 1, name: "Event Fee", code: "EF", restriction: "None", ...overrides }
}

function makeEventFee(overrides: Partial<EventFee> = {}): EventFee {
	return {
		id: 1,
		event: 1,
		fee_type: makeFeeType(),
		amount: "5.00",
		is_required: true,
		display_order: 1,
		override_amount: null,
		override_restriction: null,
		...overrides,
	}
}

function makeDetail(overrides: Partial<ServerPaymentDetail> = {}): ServerPaymentDetail {
	return {
		id: 1,
		eventFeeId: 1,
		registrationSlotId: 1,
		paymentId: 1,
		isPaid: false,
		amount: 5.0,
		...overrides,
	}
}

describe("NoAmount", () => {
	it("has zero values", () => {
		expect(NoAmount.subtotal).toBe(0)
		expect(NoAmount.transactionFee).toBe(0)
		expect(NoAmount.total).toBe(0)
	})
})

describe("calculateAmountDue", () => {
	it("returns NoAmount when details are empty", () => {
		const fees = new Map([[1, makeEventFee()]])
		expect(calculateAmountDue([], fees)).toBe(NoAmount)
	})

	it("returns NoAmount when eventFees is undefined", () => {
		const details = [makeDetail()]
		expect(calculateAmountDue(details, undefined)).toBe(NoAmount)
	})

	it("returns NoAmount when subtotal is 0", () => {
		const fees = new Map([[1, makeEventFee()]])
		const details = [makeDetail({ amount: 0 })]
		expect(calculateAmountDue(details, fees)).toBe(NoAmount)
	})

	it("calculates Stripe fees correctly for a single fee", () => {
		const fees = new Map([[1, makeEventFee()]])
		const details = [makeDetail({ amount: 5.0 })]
		const result = calculateAmountDue(details, fees)

		expect(result.subtotal).toBe(5.0)
		// total = (5.00 + 0.30) / (1 - 0.029) = 5.30 / 0.971
		const expectedTotal = 5.3 / 0.971
		expect(result.total).toBeCloseTo(expectedTotal, 2)
		expect(result.transactionFee).toBeCloseTo(expectedTotal - 5.0, 2)
	})

	it("sums multiple payment details", () => {
		const fees = new Map([
			[1, makeEventFee({ id: 1, amount: "5.00" })],
			[2, makeEventFee({ id: 2, amount: "10.00" })],
		])
		const details = [
			makeDetail({ eventFeeId: 1, amount: 5.0 }),
			makeDetail({ eventFeeId: 2, amount: 10.0 }),
		]
		const result = calculateAmountDue(details, fees)

		expect(result.subtotal).toBe(15.0)
		const expectedTotal = 15.3 / 0.971
		expect(result.total).toBeCloseTo(expectedTotal, 2)
	})

	it("handles null amounts as 0", () => {
		const fees = new Map([[1, makeEventFee()]])
		const details = [makeDetail({ amount: null }), makeDetail({ id: 2, amount: 5.0 })]
		const result = calculateAmountDue(details, fees)
		expect(result.subtotal).toBe(5.0)
	})
})

describe("formatCurrency", () => {
	it("formats whole dollar amounts", () => {
		expect(formatCurrency(5)).toBe("$5.00")
	})

	it("formats decimal amounts", () => {
		expect(formatCurrency(15.5)).toBe("$15.50")
	})

	it("formats zero", () => {
		expect(formatCurrency(0)).toBe("$0.00")
	})

	it("formats large amounts with comma", () => {
		expect(formatCurrency(1234.56)).toBe("$1,234.56")
	})
})
