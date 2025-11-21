import { parsePurseAmount } from "../utils"

describe("parsePurseAmount", () => {
	describe("valid currency strings", () => {
		it("should parse simple dollar amount", () => {
			expect(parsePurseAmount("$123.45")).toBe(123.45)
		})

		it("should parse dollar amount with commas", () => {
			expect(parsePurseAmount("$1,234.56")).toBe(1234.56)
		})

		it("should parse amount without dollar sign", () => {
			expect(parsePurseAmount("789.01")).toBe(789.01)
		})

		it("should parse amount with leading spaces", () => {
			expect(parsePurseAmount("  $123.45")).toBe(123.45)
		})

		it("should parse amount with trailing spaces", () => {
			expect(parsePurseAmount("$123.45  ")).toBe(123.45)
		})

		it("should parse whole dollar amount", () => {
			expect(parsePurseAmount("$100")).toBe(100)
		})

		it("should parse amount with multiple commas", () => {
			expect(parsePurseAmount("$1,234,567.89")).toBe(1234567.89)
		})

		it("should parse very small positive amount", () => {
			expect(parsePurseAmount("$0.01")).toBe(0.01)
		})

		it("should parse very large amount", () => {
			expect(parsePurseAmount("$999999.99")).toBe(999999.99)
		})
	})

	describe("zero or negative amounts", () => {
		it("should return null for zero", () => {
			expect(parsePurseAmount("$0")).toBeNull()
		})

		it("should return null for zero with decimals", () => {
			expect(parsePurseAmount("$0.00")).toBeNull()
		})

		it("should return null for negative amount", () => {
			expect(parsePurseAmount("-$100")).toBeNull()
		})

		it("should return null for negative zero", () => {
			expect(parsePurseAmount("-$0.00")).toBeNull()
		})
	})

	describe("empty or null inputs", () => {
		it("should return null for empty string", () => {
			expect(parsePurseAmount("")).toBeNull()
		})

		it("should return null for whitespace-only string", () => {
			expect(parsePurseAmount("   ")).toBeNull()
		})

		it("should return null for null input", () => {
			expect(parsePurseAmount(null)).toBeNull()
		})

		it("should return null for undefined input", () => {
			expect(parsePurseAmount(undefined)).toBeNull()
		})

		it("should return null for empty string after trimming currency characters", () => {
			expect(parsePurseAmount("$")).toBeNull()
		})
	})

	describe("invalid formats", () => {
		it("should throw for non-numeric string", () => {
			expect(() => parsePurseAmount("invalid")).toThrow()
		})

		it("should throw for currency string with non-numeric content", () => {
			expect(() => parsePurseAmount("$invalid")).toThrow()
		})

		it("should parse numeric prefix from mixed alphanumeric", () => {
			expect(parsePurseAmount("$123abc")).toBe(123)
		})

		it("should throw for text with dollar sign", () => {
			expect(() => parsePurseAmount("$free")).toThrow()
		})

		it("should throw for multiple decimal points", () => {
			expect(() => parsePurseAmount("$1.23.45")).toThrow()
		})

		it("should throw for incomplete currency string", () => {
			expect(() => parsePurseAmount("$123.")).toThrow()
		})
	})

	describe("edge cases", () => {
		it("should handle multiple dollar signs", () => {
			expect(parsePurseAmount("$$100")).toBe(100)
		})

		it("should handle dollar sign and comma together", () => {
			expect(parsePurseAmount("$1,000")).toBe(1000)
		})

		it("should handle very long decimal places", () => {
			expect(parsePurseAmount("$123.456789")).toBeCloseTo(123.456789)
		})

		it("should handle scientific notation", () => {
			expect(parsePurseAmount("$1e3")).toBe(1000)
		})
	})
})
