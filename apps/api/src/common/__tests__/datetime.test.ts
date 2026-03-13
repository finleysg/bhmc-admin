import { fromMysqlDatetime, toLocalDatetime, toMysqlDatetime } from "../datetime"

describe("toMysqlDatetime", () => {
	it("converts ISO 8601 with Z suffix", () => {
		expect(toMysqlDatetime("2026-03-08T16:00:00.000Z")).toBe("2026-03-08 16:00:00.000000")
	})

	it("converts ISO 8601 with milliseconds", () => {
		expect(toMysqlDatetime("2026-03-16T04:30:45.123Z")).toBe("2026-03-16 04:30:45.123000")
	})

	it("converts ISO 8601 without milliseconds", () => {
		expect(toMysqlDatetime("2026-01-01T00:00:00Z")).toBe("2026-01-01 00:00:00.000000")
	})

	it("handles timezone offset strings", () => {
		expect(toMysqlDatetime("2026-03-08T10:00:00.000-06:00")).toBe("2026-03-08 16:00:00.000000")
	})

	it("throws on invalid datetime", () => {
		expect(() => toMysqlDatetime("not-a-date")).toThrow("Invalid datetime value")
	})
})

describe("fromMysqlDatetime", () => {
	it("converts standard MySQL datetime with microseconds", () => {
		expect(fromMysqlDatetime("2026-03-08 16:00:00.000000")).toBe("2026-03-08T16:00:00.000Z")
	})

	it("converts MySQL datetime with non-zero microseconds", () => {
		expect(fromMysqlDatetime("2026-03-16 04:30:45.123000")).toBe("2026-03-16T04:30:45.123Z")
	})

	it("converts MySQL datetime without fractional seconds", () => {
		expect(fromMysqlDatetime("2026-01-01 00:00:00")).toBe("2026-01-01T00:00:00.000Z")
	})

	it("is idempotent with Z suffix", () => {
		expect(fromMysqlDatetime("2026-03-08T16:00:00.000Z")).toBe("2026-03-08T16:00:00.000Z")
	})

	it("is idempotent with timezone offset", () => {
		expect(fromMysqlDatetime("2026-03-08T10:00:00.000-06:00")).toBe("2026-03-08T10:00:00.000-06:00")
	})

	it("throws on invalid input", () => {
		expect(() => fromMysqlDatetime("not-a-date")).toThrow("Invalid MySQL datetime value")
	})

	it("round-trips with toMysqlDatetime", () => {
		const iso = "2026-03-08T16:00:00.000Z"
		const mysql = toMysqlDatetime(iso)
		const result = fromMysqlDatetime(mysql)
		expect(new Date(result).getTime()).toBe(new Date(iso).getTime())
	})
})

describe("toLocalDatetime", () => {
	it("converts UTC evening to Central date with time", () => {
		// 03:30 UTC on March 9 = 10:30 PM CDT on March 8 (DST active)
		expect(toLocalDatetime("2026-03-09 03:30:00.000000")).toBe("2026-03-08 10:30 PM")
	})

	it("converts UTC afternoon to Central date with time", () => {
		// 20:15 UTC = 2:15 PM CST
		expect(toLocalDatetime("2026-01-15 20:15:00.000000")).toBe("2026-01-15 2:15 PM")
	})

	it("handles CDT (summer time)", () => {
		// July 4, 2026 18:00 UTC = 1:00 PM CDT
		expect(toLocalDatetime("2026-07-04 18:00:00.000000")).toBe("2026-07-04 1:00 PM")
	})

	it("uses specified timezone", () => {
		// 20:00 UTC = 3:00 PM EST
		expect(toLocalDatetime("2026-01-15 20:00:00.000000", "America/New_York")).toBe(
			"2026-01-15 3:00 PM",
		)
	})
})
