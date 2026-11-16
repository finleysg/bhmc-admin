import {
	daysBetween,
	fromClubLocalInput,
	shiftByClubDays,
	shiftLocalInput,
	toClubLocalInput,
} from "../club-time"

describe("club time", () => {
	it.each([
		["standard time", "2027-01-15T09:00", "2027-01-15T15:00:00.000Z"],
		["daylight time", "2027-04-28T09:00", "2027-04-28T14:00:00.000Z"],
		["the evening before a UTC date change", "2027-04-28T21:30", "2027-04-29T02:30:00.000Z"],
	])("converts both ways in %s", (_, local, utc) => {
		expect(fromClubLocalInput(local)).toBe(utc)
		expect(toClubLocalInput(utc)).toBe(local)
	})

	it("treats empty values as not set", () => {
		expect(fromClubLocalInput("")).toBeNull()
		expect(toClubLocalInput(null)).toBe("")
	})

	it("counts whole days between dates", () => {
		expect(daysBetween("2026-04-01", "2027-03-31")).toBe(364)
		expect(daysBetween("2027-03-31", "2026-04-01")).toBe(-364)
		expect(daysBetween("", "2027-03-31")).toBeNull()
	})

	it("moves a club-time value by whole days, keeping the time across a daylight saving change", () => {
		expect(shiftLocalInput("2027-02-24T09:00", 35)).toBe("2027-03-31T09:00")
		expect(fromClubLocalInput(shiftLocalInput("2027-02-24T09:00", 35))).toBe(
			"2027-03-31T14:00:00.000Z",
		)
		expect(shiftLocalInput("", 7)).toBe("")
	})

	it("moves an API datetime by whole days at the same club time", () => {
		// 9:00 AM CST on Feb 24 → 9:00 AM CDT on Mar 31
		expect(shiftByClubDays("2027-02-24T15:00:00.000Z", 35)).toBe("2027-03-31T14:00:00.000Z")
		expect(shiftByClubDays(null, 35)).toBeNull()
	})
})
