import { parseHandicapIndex, calculateCoursePar } from "../handicap.utils"

describe("parseHandicapIndex", () => {
	describe("positive handicaps", () => {
		it("should parse simple handicap index", () => {
			expect(parseHandicapIndex("6.7")).toBe(6.7)
		})

		it("should parse integer handicap", () => {
			expect(parseHandicapIndex("10")).toBe(10)
		})

		it("should parse high handicap", () => {
			expect(parseHandicapIndex("36.4")).toBe(36.4)
		})

		it("should parse scratch handicap", () => {
			expect(parseHandicapIndex("0.0")).toBe(0)
		})
	})

	describe("plus handicaps (negative)", () => {
		it("should parse plus handicap as negative", () => {
			expect(parseHandicapIndex("+2.3")).toBe(-2.3)
		})

		it("should parse plus handicap integer as negative", () => {
			expect(parseHandicapIndex("+5")).toBe(-5)
		})

		it("should parse small plus handicap", () => {
			expect(parseHandicapIndex("+0.5")).toBe(-0.5)
		})
	})

	describe("empty/null/undefined inputs", () => {
		it("should return null for empty string", () => {
			expect(parseHandicapIndex("")).toBeNull()
		})

		it("should return null for whitespace-only string", () => {
			expect(parseHandicapIndex("   ")).toBeNull()
		})

		it("should return null for null input", () => {
			expect(parseHandicapIndex(null)).toBeNull()
		})

		it("should return null for undefined input", () => {
			expect(parseHandicapIndex(undefined)).toBeNull()
		})
	})

	describe("whitespace handling", () => {
		it("should handle leading whitespace", () => {
			expect(parseHandicapIndex("  6.7")).toBe(6.7)
		})

		it("should handle trailing whitespace", () => {
			expect(parseHandicapIndex("6.7  ")).toBe(6.7)
		})

		it("should handle whitespace with plus handicap", () => {
			expect(parseHandicapIndex("  +2.3  ")).toBe(-2.3)
		})
	})

	describe("invalid inputs", () => {
		it("should return null for non-numeric string", () => {
			expect(parseHandicapIndex("abc")).toBeNull()
		})

		it("should return null for plus sign only", () => {
			expect(parseHandicapIndex("+")).toBeNull()
		})

		it("should return null for plus with non-numeric", () => {
			expect(parseHandicapIndex("+abc")).toBeNull()
		})
	})
})

describe("calculateCoursePar", () => {
	it("should sum front 9 par values", () => {
		const parValues = [
			4,
			5,
			3,
			4,
			5,
			4,
			4,
			3,
			4,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		]
		expect(calculateCoursePar(parValues)).toBe(36)
	})

	it("should sum back 9 par values", () => {
		const parValues = [
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			4,
			4,
			3,
			5,
			4,
			4,
			5,
			3,
			4,
		]
		expect(calculateCoursePar(parValues)).toBe(36)
	})

	it("should sum full 18 holes", () => {
		const parValues = [4, 5, 3, 4, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4]
		expect(calculateCoursePar(parValues)).toBe(72)
	})

	it("should return 0 for all-null array", () => {
		const parValues = [
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		]
		expect(calculateCoursePar(parValues)).toBe(0)
	})

	it("should return 0 for empty array", () => {
		expect(calculateCoursePar([])).toBe(0)
	})
})
