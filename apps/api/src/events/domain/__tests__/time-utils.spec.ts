import { formatTime, parseTeeTimeSplits, parseTime } from "../time-utils"

describe("time-utils", () => {
	describe("parseTime", () => {
		it('parses "5:00 PM" to 1020', () => {
			expect(parseTime("5:00 PM")).toBe(17 * 60)
		})

		it('parses "12:00 AM" to 0', () => {
			expect(parseTime("12:00 AM")).toBe(0)
		})

		it("throws on invalid format", () => {
			expect(() => parseTime("invalid")).toThrow()
		})
	})

	describe("formatTime", () => {
		it('formats 1020 to "5:00 PM"', () => {
			expect(formatTime(1020)).toBe("5:00 PM")
		})

		it('formats 0 to "12:00 AM"', () => {
			expect(formatTime(0)).toBe("12:00 AM")
		})

		it("wraps values >= 24*60", () => {
			expect(formatTime(24 * 60 + 30)).toBe("12:30 AM")
		})
	})

	describe("parseTeeTimeSplits", () => {
		it('parses "9" to [9]', () => {
			expect(parseTeeTimeSplits("9")).toEqual([9])
		})

		it('parses "8,9" to [8,9]', () => {
			expect(parseTeeTimeSplits("8,9")).toEqual([8, 9])
		})

		it("throws on empty or missing value", () => {
			expect(() => parseTeeTimeSplits(null as unknown as string)).toThrow()
			expect(() => parseTeeTimeSplits("")).toThrow()
		})
	})
})
