import { toMysqlDatetime } from "../datetime"

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
