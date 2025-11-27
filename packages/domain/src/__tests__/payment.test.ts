import { calculateTransactionFee } from "../functions/payment"

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
		expect(calculateTransactionFee(50.5)).toBeCloseTo(1.7665) // 50.50 * 0.029 + 0.30 ≈ 1.4645 + 0.30 = 1.7645
	})
})
