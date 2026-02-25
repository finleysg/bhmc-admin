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
	it("formats a Date object with day, date and time in Central Time", () => {
		// Use a UTC date to verify timezone conversion
		const date = new Date("2024-06-15T19:30:00Z") // 7:30 PM UTC = 2:30 PM CDT
		const result = dayDateAndTimeFormat(date)
		expect(result).toBe("Saturday, Jun 15, 2:30 PM")
	})

	it("parses an ISO string input in Central Time", () => {
		const result = dayDateAndTimeFormat("2024-06-15T19:30:00Z") // 7:30 PM UTC = 2:30 PM CDT
		expect(result).toBe("Saturday, Jun 15, 2:30 PM")
	})

	it("returns empty string for null", () => {
		expect(dayDateAndTimeFormat(null)).toBe("")
	})

	it("returns empty string for undefined", () => {
		expect(dayDateAndTimeFormat(undefined)).toBe("")
	})
})
