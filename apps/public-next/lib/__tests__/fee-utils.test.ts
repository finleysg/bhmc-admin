import type { EventFee, FeeType } from "../types"
import { calculateFeeAmount, evaluateRestriction } from "../registration/fee-utils"
import type { FeePlayer } from "../registration/fee-utils"

function makeFeeType(overrides: Partial<FeeType> = {}): FeeType {
	return { id: 1, name: "Event Fee", code: "EF", restriction: "None", ...overrides }
}

function makeEventFee(overrides: Partial<EventFee> = {}): EventFee {
	return {
		id: 1,
		event: 1,
		fee_type: makeFeeType(),
		amount: "10.00",
		is_required: true,
		display_order: 1,
		override_amount: null,
		override_restriction: null,
		...overrides,
	}
}

function makePlayer(overrides: Partial<FeePlayer> = {}): FeePlayer {
	return {
		birthDate: "1980-06-15",
		isMember: true,
		lastSeason: new Date().getFullYear() - 1,
		...overrides,
	}
}

describe("calculateFeeAmount", () => {
	it("returns the base amount when no override restriction", () => {
		const fee = makeEventFee({ amount: "10.00" })
		expect(calculateFeeAmount(fee)).toBe(10)
	})

	it("returns the base amount when no player is provided", () => {
		const fee = makeEventFee({
			amount: "10.00",
			override_amount: "5.00",
			override_restriction: "Seniors",
		})
		expect(calculateFeeAmount(fee)).toBe(10)
	})

	it("returns override amount when restriction matches", () => {
		const fee = makeEventFee({
			amount: "10.00",
			override_amount: "5.00",
			override_restriction: "Seniors",
		})
		// Player born 70 years ago
		const birthYear = new Date().getFullYear() - 70
		const player = makePlayer({ birthDate: `${birthYear}-01-15` })
		expect(calculateFeeAmount(fee, player)).toBe(5)
	})

	it("returns base amount when restriction does not match", () => {
		const fee = makeEventFee({
			amount: "10.00",
			override_amount: "5.00",
			override_restriction: "Seniors",
		})
		// Player born 30 years ago - not a senior
		const birthYear = new Date().getFullYear() - 30
		const player = makePlayer({ birthDate: `${birthYear}-01-15` })
		expect(calculateFeeAmount(fee, player)).toBe(10)
	})

	it("returns base amount when override_amount is null", () => {
		const fee = makeEventFee({
			amount: "10.00",
			override_amount: null,
			override_restriction: "Seniors",
		})
		const birthYear = new Date().getFullYear() - 70
		const player = makePlayer({ birthDate: `${birthYear}-01-15` })
		expect(calculateFeeAmount(fee, player)).toBe(10)
	})
})

describe("evaluateRestriction", () => {
	it("Seniors: true when player is 62 or older", () => {
		const birthYear = new Date().getFullYear() - 62
		const player = makePlayer({ birthDate: `${birthYear}-01-01` })
		expect(evaluateRestriction("Seniors", player)).toBe(true)
	})

	it("Seniors: false when player is under 62", () => {
		const birthYear = new Date().getFullYear() - 50
		const player = makePlayer({ birthDate: `${birthYear}-06-15` })
		expect(evaluateRestriction("Seniors", player)).toBe(false)
	})

	it("Seniors: false when birthDate is null", () => {
		const player = makePlayer({ birthDate: null })
		expect(evaluateRestriction("Seniors", player)).toBe(false)
	})

	it("Non-Seniors: true when player is under 62", () => {
		const birthYear = new Date().getFullYear() - 50
		const player = makePlayer({ birthDate: `${birthYear}-06-15` })
		expect(evaluateRestriction("Non-Seniors", player)).toBe(true)
	})

	it("Non-Seniors: true when birthDate is null (age=0)", () => {
		const player = makePlayer({ birthDate: null })
		expect(evaluateRestriction("Non-Seniors", player)).toBe(true)
	})

	it("New Members: true when not a returning member", () => {
		const player = makePlayer({ lastSeason: 2020 })
		expect(evaluateRestriction("New Members", player)).toBe(true)
	})

	it("New Members: false when returning member", () => {
		const currentYear = new Date().getFullYear()
		const player = makePlayer({ lastSeason: currentYear - 1 })
		expect(evaluateRestriction("New Members", player)).toBe(false)
	})

	it("Returning Members: true when lastSeason is previous year", () => {
		const currentYear = new Date().getFullYear()
		const player = makePlayer({ lastSeason: currentYear - 1 })
		expect(evaluateRestriction("Returning Members", player)).toBe(true)
	})

	it("Members: true when player is a member", () => {
		const player = makePlayer({ isMember: true })
		expect(evaluateRestriction("Members", player)).toBe(true)
	})

	it("Members: false when player is not a member", () => {
		const player = makePlayer({ isMember: false })
		expect(evaluateRestriction("Members", player)).toBe(false)
	})

	it("Non-Members: true when player is not a member", () => {
		const player = makePlayer({ isMember: false })
		expect(evaluateRestriction("Non-Members", player)).toBe(true)
	})

	it("returns false for unknown restriction", () => {
		const player = makePlayer()
		expect(evaluateRestriction("UnknownRestriction", player)).toBe(false)
	})
})
