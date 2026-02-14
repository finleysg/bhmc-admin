import {
	parseApiDate,
	dayAndDateFormat,
	isoDayFormat,
	monthNameFormat,
	dayDateAndTimeFormat,
} from "../date-utils"

describe("parseApiDate", () => {
	it("parses a date-only string as local time (not UTC)", () => {
		const date = parseApiDate("2024-06-15")
		expect(date.getFullYear()).toBe(2024)
		expect(date.getMonth()).toBe(5) // June = 5
		expect(date.getDate()).toBe(15)
	})

	it("does not shift date backwards in US timezones", () => {
		// The whole reason this function exists: new Date("2024-06-15") would parse as
		// midnight UTC, rolling back to June 14 in US timezones.
		const date = parseApiDate("2024-06-15")
		expect(date.getDate()).toBe(15)
	})
})

describe("dayAndDateFormat", () => {
	it("formats a date as 'Day, Mon DDth'", () => {
		const date = new Date(2024, 5, 15) // Saturday, June 15, 2024
		expect(dayAndDateFormat(date)).toBe("Saturday, Jun 15th")
	})

	it("returns '--' for invalid date", () => {
		expect(dayAndDateFormat(new Date("invalid"))).toBe("--")
	})

	it("returns '--' for 0", () => {
		expect(dayAndDateFormat(0)).toBe("--")
	})
})

describe("isoDayFormat", () => {
	it("formats a date as yyyy-MM-dd", () => {
		const date = new Date(2024, 0, 5) // January 5, 2024
		expect(isoDayFormat(date)).toBe("2024-01-05")
	})

	it("returns '--' for invalid date", () => {
		expect(isoDayFormat(new Date("invalid"))).toBe("--")
	})
})

describe("monthNameFormat", () => {
	it("returns the full month name", () => {
		const date = new Date(2024, 11, 1) // December
		expect(monthNameFormat(date)).toBe("December")
	})

	it("returns '--' for invalid date", () => {
		expect(monthNameFormat(new Date("invalid"))).toBe("--")
	})
})

describe("dayDateAndTimeFormat", () => {
	it("formats a Date object with day, date and time", () => {
		const date = new Date(2024, 5, 15, 14, 30) // June 15, 2024 2:30 PM
		const result = dayDateAndTimeFormat(date)
		expect(result).toContain("Saturday")
		expect(result).toContain("Jun 15")
		expect(result).toContain("2:30")
	})

	it("parses an ISO string input", () => {
		const result = dayDateAndTimeFormat("2024-06-15T14:30:00")
		expect(result).toContain("Jun 15")
	})

	it("returns empty string for null", () => {
		expect(dayDateAndTimeFormat(null)).toBe("")
	})

	it("returns empty string for undefined", () => {
		expect(dayDateAndTimeFormat(undefined)).toBe("")
	})
})
