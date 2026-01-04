import {
	calculateTransactionFee,
	formatCurrency,
	calculateAmountDue,
	calculateAmountDueInCents,
	getAmount,
	getTotalAmountForPlayer,
	getRequiredFees,
	getOptionalFees,
	deriveNotificationType,
} from "../functions/payment"
import {
	EventTypeChoices,
	FeeRestrictionChoices,
	NotificationTypeChoices,
	PayoutTypeChoices,
} from "../types"
import type { Player, EventFee, CompletePayment, FeeType } from "../types"

// Test fixtures
const createPlayer = (overrides: Partial<Player> = {}): Player => ({
	id: 1,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	tee: "White",
	isMember: false,
	...overrides,
})

const createFeeType = (overrides: Partial<FeeType> = {}): FeeType => ({
	id: 1,
	name: "Green Fee",
	code: "GF",
	payout: PayoutTypeChoices.CASH,
	restriction: FeeRestrictionChoices.NONE,
	...overrides,
})

const createEventFee = (overrides: Partial<EventFee> = {}): EventFee => ({
	id: 1,
	eventId: 100,
	amount: 25,
	isRequired: true,
	displayOrder: 1,
	feeTypeId: 1,
	...overrides,
})

describe("calculateTransactionFee", () => {
	it("returns 0 for amount 0", () => {
		expect(calculateTransactionFee(0)).toBe(0)
	})

	it("calculates fee for positive amounts", () => {
		expect(calculateTransactionFee(10)).toBeCloseTo(0.59) // 10 * 0.029 + 0.30 = 0.29 + 0.30 = 0.59
		expect(calculateTransactionFee(100)).toBeCloseTo(3.2) // 100 * 0.029 + 0.30 = 2.90 + 0.30 = 3.20
		expect(calculateTransactionFee(1000)).toBeCloseTo(29.3) // 1000 * 0.029 + 0.30 = 29.00 + 0.30 = 29.30
	})

	it("handles decimal amounts", () => {
		expect(calculateTransactionFee(50.5)).toBeCloseTo(1.76) // 50.50 * 0.029 + 0.30 ≈ 1.7645, rounded
	})

	it("throws for negative amounts", () => {
		expect(() => calculateTransactionFee(-10)).toThrow()
	})

	it("throws for non-finite amounts", () => {
		expect(() => calculateTransactionFee(Infinity)).toThrow()
		expect(() => calculateTransactionFee(NaN)).toThrow()
	})
})

describe("formatCurrency", () => {
	it("formats whole dollar amounts", () => {
		expect(formatCurrency(10)).toBe("$10.00")
		expect(formatCurrency(100)).toBe("$100.00")
		expect(formatCurrency(1000)).toBe("$1,000.00")
	})

	it("formats amounts with cents", () => {
		expect(formatCurrency(10.5)).toBe("$10.50")
		expect(formatCurrency(10.99)).toBe("$10.99")
		expect(formatCurrency(10.123)).toBe("$10.12") // Rounds to 2 decimal places
	})

	it("formats zero", () => {
		expect(formatCurrency(0)).toBe("$0.00")
	})

	it("formats negative amounts", () => {
		expect(formatCurrency(-10)).toBe("-$10.00")
	})

	it("rounds properly", () => {
		expect(formatCurrency(10.995)).toBe("$11.00") // Rounds up
		expect(formatCurrency(10.994)).toBe("$10.99") // Rounds down
	})
})

describe("calculateAmountDue", () => {
	it("calculates total for single amount", () => {
		const result = calculateAmountDue([100])
		expect(result.subtotal).toBe(100)
		expect(result.transactionFee).toBeCloseTo(3.2)
		expect(result.total).toBeCloseTo(103.2)
	})

	it("calculates total for multiple amounts", () => {
		const result = calculateAmountDue([50, 25, 25])
		expect(result.subtotal).toBe(100)
		expect(result.transactionFee).toBeCloseTo(3.2)
		expect(result.total).toBeCloseTo(103.2)
	})

	it("handles empty array", () => {
		const result = calculateAmountDue([])
		expect(result.subtotal).toBe(0)
		expect(result.transactionFee).toBe(0)
		expect(result.total).toBe(0)
	})

	it("handles decimal amounts", () => {
		const result = calculateAmountDue([10.5, 5.25])
		expect(result.subtotal).toBe(15.75)
		expect(result.transactionFee).toBeCloseTo(0.76) // 15.75 * 0.029 + 0.30 ≈ 0.7568
	})
})

describe("calculateAmountDueInCents", () => {
	it("converts to cents", () => {
		const result = calculateAmountDueInCents([100])
		expect(result.subtotal).toBe(10000) // $100 = 10000 cents
		expect(result.transactionFee).toBe(320) // $3.20 = 320 cents
		expect(result.total).toBe(10320) // $103.20 = 10320 cents
	})

	it("handles empty array", () => {
		const result = calculateAmountDueInCents([])
		expect(result.subtotal).toBe(0)
		expect(result.transactionFee).toBe(0)
		expect(result.total).toBe(0)
	})

	it("rounds cents properly", () => {
		const result = calculateAmountDueInCents([10.5])
		expect(result.subtotal).toBe(1050)
	})
})

describe("getAmount", () => {
	it("returns base amount when no override", () => {
		const fee = createEventFee({ amount: 25 })
		const player = createPlayer()
		expect(getAmount(fee, player)).toBe(25)
	})

	it("returns base amount when override exists but restriction does not match", () => {
		const fee = createEventFee({
			amount: 25,
			overrideAmount: 20,
			overrideRestriction: FeeRestrictionChoices.MEMBERS,
		})
		const player = createPlayer({ isMember: false })
		expect(getAmount(fee, player)).toBe(25)
	})

	it("returns override amount for member when restriction is MEMBERS", () => {
		const fee = createEventFee({
			amount: 25,
			overrideAmount: 20,
			overrideRestriction: FeeRestrictionChoices.MEMBERS,
		})
		const player = createPlayer({ isMember: true })
		expect(getAmount(fee, player)).toBe(20)
	})

	it("returns override amount for senior when restriction is SENIORS", () => {
		// Born 65 years ago
		const birthDate = new Date()
		birthDate.setFullYear(birthDate.getFullYear() - 65)
		const fee = createEventFee({
			amount: 25,
			overrideAmount: 20,
			overrideRestriction: FeeRestrictionChoices.SENIORS,
		})
		const player = createPlayer({ birthDate: birthDate.toISOString().split("T")[0] })
		expect(getAmount(fee, player)).toBe(20)
	})

	it("returns base amount for non-senior when restriction is SENIORS", () => {
		// Born 30 years ago
		const birthDate = new Date()
		birthDate.setFullYear(birthDate.getFullYear() - 30)
		const fee = createEventFee({
			amount: 25,
			overrideAmount: 20,
			overrideRestriction: FeeRestrictionChoices.SENIORS,
		})
		const player = createPlayer({ birthDate: birthDate.toISOString().split("T")[0] })
		expect(getAmount(fee, player)).toBe(25)
	})

	it("uses event date for senior calculation when provided", () => {
		// Player born 62 years before event date - senior at event time
		const eventDate = new Date(2025, 6, 15) // July 15, 2025
		const birthDate = new Date(1963, 0, 1) // Jan 1, 1963 - will be 62 at event

		const fee = createEventFee({
			amount: 25,
			overrideAmount: 20,
			overrideRestriction: FeeRestrictionChoices.SENIORS,
		})
		const player = createPlayer({ birthDate: birthDate.toISOString().split("T")[0] })
		expect(getAmount(fee, player, eventDate)).toBe(20)
	})
})

describe("getTotalAmountForPlayer", () => {
	it("calculates total for multiple fees", () => {
		const player = createPlayer()
		const fees = [createEventFee({ amount: 25 }), createEventFee({ id: 2, amount: 15 })]
		const result = getTotalAmountForPlayer(player, fees)
		expect(result.subtotal).toBe(40)
	})

	it("applies member discount to all applicable fees", () => {
		const player = createPlayer({ isMember: true })
		const fees = [
			createEventFee({
				amount: 25,
				overrideAmount: 20,
				overrideRestriction: FeeRestrictionChoices.MEMBERS,
			}),
			createEventFee({
				id: 2,
				amount: 15,
				overrideAmount: 10,
				overrideRestriction: FeeRestrictionChoices.MEMBERS,
			}),
		]
		const result = getTotalAmountForPlayer(player, fees)
		expect(result.subtotal).toBe(30) // 20 + 10
	})

	it("handles empty fees array", () => {
		const player = createPlayer()
		const result = getTotalAmountForPlayer(player, [])
		expect(result.subtotal).toBe(0)
		expect(result.total).toBe(0)
	})
})

describe("getRequiredFees", () => {
	it("sums only required fees", () => {
		const payment: CompletePayment = {
			id: 1,
			paymentCode: "pi_test",
			confirmed: false,
			eventId: 100,
			userId: 1,
			paymentAmount: 50,
			transactionFee: 1.75,
			paymentDate: "2024-01-01",
			details: [
				{
					id: 1,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 25,
					isPaid: false,
					eventFeeId: 1,
					eventFee: { ...createEventFee({ isRequired: true }), feeType: createFeeType() },
				},
				{
					id: 2,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 15,
					isPaid: false,
					eventFeeId: 2,
					eventFee: { ...createEventFee({ id: 2, isRequired: false }), feeType: createFeeType() },
				},
				{
					id: 3,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 10,
					isPaid: false,
					eventFeeId: 3,
					eventFee: { ...createEventFee({ id: 3, isRequired: true }), feeType: createFeeType() },
				},
			],
		}
		expect(getRequiredFees(payment)).toBe(35) // 25 + 10
	})

	it("returns 0 when no required fees", () => {
		const payment: CompletePayment = {
			id: 1,
			paymentCode: "pi_test",
			confirmed: false,
			eventId: 100,
			userId: 1,
			paymentAmount: 15,
			transactionFee: 0.74,
			paymentDate: "2024-01-01",
			details: [
				{
					id: 1,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 15,
					isPaid: false,
					eventFeeId: 1,
					eventFee: { ...createEventFee({ isRequired: false }), feeType: createFeeType() },
				},
			],
		}
		expect(getRequiredFees(payment)).toBe(0)
	})
})

describe("getOptionalFees", () => {
	it("sums only optional fees", () => {
		const payment: CompletePayment = {
			id: 1,
			paymentCode: "pi_test",
			confirmed: false,
			eventId: 100,
			userId: 1,
			paymentAmount: 50,
			transactionFee: 1.75,
			paymentDate: "2024-01-01",
			details: [
				{
					id: 1,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 25,
					isPaid: false,
					eventFeeId: 1,
					eventFee: { ...createEventFee({ isRequired: true }), feeType: createFeeType() },
				},
				{
					id: 2,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 15,
					isPaid: false,
					eventFeeId: 2,
					eventFee: { ...createEventFee({ id: 2, isRequired: false }), feeType: createFeeType() },
				},
				{
					id: 3,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 10,
					isPaid: false,
					eventFeeId: 3,
					eventFee: { ...createEventFee({ id: 3, isRequired: false }), feeType: createFeeType() },
				},
			],
		}
		expect(getOptionalFees(payment)).toBe(25) // 15 + 10
	})

	it("returns 0 when no optional fees", () => {
		const payment: CompletePayment = {
			id: 1,
			paymentCode: "pi_test",
			confirmed: false,
			eventId: 100,
			userId: 1,
			paymentAmount: 25,
			transactionFee: 1.03,
			paymentDate: "2024-01-01",
			details: [
				{
					id: 1,
					registrationSlotId: 1,
					paymentId: 1,
					amount: 25,
					isPaid: false,
					eventFeeId: 1,
					eventFee: { ...createEventFee({ isRequired: true }), feeType: createFeeType() },
				},
			],
		}
		expect(getOptionalFees(payment)).toBe(0)
	})
})

describe("deriveNotificationType", () => {
	const currentYear = new Date().getFullYear()

	describe("season registration events", () => {
		it("returns RETURNING_MEMBER when last season was previous year", () => {
			const result = deriveNotificationType(
				EventTypeChoices.SEASON_REGISTRATION,
				currentYear - 1,
				true,
			)
			expect(result).toBe(NotificationTypeChoices.RETURNING_MEMBER)
		})

		it("returns NEW_MEMBER when last season was not previous year", () => {
			const result = deriveNotificationType(
				EventTypeChoices.SEASON_REGISTRATION,
				currentYear - 2,
				true,
			)
			expect(result).toBe(NotificationTypeChoices.NEW_MEMBER)
		})

		it("returns NEW_MEMBER when last season is null", () => {
			const result = deriveNotificationType(EventTypeChoices.SEASON_REGISTRATION, null, true)
			expect(result).toBe(NotificationTypeChoices.NEW_MEMBER)
		})
	})

	describe("match play events", () => {
		it("returns MATCH_PLAY for match play events", () => {
			const result = deriveNotificationType(EventTypeChoices.MATCH_PLAY, null, true)
			expect(result).toBe(NotificationTypeChoices.MATCH_PLAY)
		})

		it("returns MATCH_PLAY regardless of player season or fees", () => {
			const result = deriveNotificationType(EventTypeChoices.MATCH_PLAY, currentYear - 1, false)
			expect(result).toBe(NotificationTypeChoices.MATCH_PLAY)
		})
	})

	describe("other events", () => {
		it("returns SIGNUP_CONFIRMATION when has required fees", () => {
			const result = deriveNotificationType(EventTypeChoices.WEEKNIGHT, null, true)
			expect(result).toBe(NotificationTypeChoices.SIGNUP_CONFIRMATION)
		})

		it("returns UPDATED_REGISTRATION when no required fees", () => {
			const result = deriveNotificationType(EventTypeChoices.WEEKNIGHT, null, false)
			expect(result).toBe(NotificationTypeChoices.UPDATED_REGISTRATION)
		})

		it("works for weekend major events", () => {
			expect(deriveNotificationType(EventTypeChoices.WEEKEND_MAJOR, null, true)).toBe(
				NotificationTypeChoices.SIGNUP_CONFIRMATION,
			)
			expect(deriveNotificationType(EventTypeChoices.WEEKEND_MAJOR, null, false)).toBe(
				NotificationTypeChoices.UPDATED_REGISTRATION,
			)
		})
	})

	describe("custom date handling", () => {
		it("uses provided date for season calculation", () => {
			const customDate = new Date(2025, 5, 15) // June 15, 2025
			const result = deriveNotificationType(
				EventTypeChoices.SEASON_REGISTRATION,
				2024, // Last season was 2024
				true,
				customDate,
			)
			expect(result).toBe(NotificationTypeChoices.RETURNING_MEMBER)
		})
	})
})
