import { daysBetween, proposedDate, proposedName, shiftByClubDays } from "../roll-forward"

describe("proposedDate", () => {
	it("moves the date 364 days, keeping the weekday", () => {
		expect(proposedDate("2026-05-06", 2026, 2027)).toBe("2027-05-05") // Wednesday → Wednesday
	})

	it("moves 52 weeks per season between the seasons", () => {
		expect(proposedDate("2025-05-07", 2025, 2027)).toBe("2027-05-05")
	})
})

describe("proposedName", () => {
	it("replaces the source year with the target year", () => {
		expect(proposedName("2026 Season Registration", 2026, 2027)).toBe("2027 Season Registration")
	})

	it("leaves names without the year alone", () => {
		expect(proposedName("Individual LG/LN", 2026, 2027)).toBe("Individual LG/LN")
		expect(proposedName("Team 20261", 2026, 2027)).toBe("Team 20261")
	})
})

describe("daysBetween", () => {
	it("counts whole days", () => {
		expect(daysBetween("2026-05-06", "2027-05-05")).toBe(364)
		expect(daysBetween("2026-05-06", "2026-05-01")).toBe(-5)
	})
})

describe("shiftByClubDays", () => {
	it("keeps the club wall-clock time across a daylight saving change", () => {
		// 9:00 PM CST on Mar 1 → 9:00 PM CDT on Mar 15.
		expect(shiftByClubDays("2027-03-02T03:00:00.000Z", 14)).toBe("2027-03-16T02:00:00.000Z")
	})

	it("moves a year forward at the same club time", () => {
		// 10:00 PM CDT Mar 29 2026 → 10:00 PM CDT Mar 28 2027.
		expect(shiftByClubDays("2026-03-30T03:00:00.000Z", 364)).toBe("2027-03-29T03:00:00.000Z")
	})

	it("keeps null", () => {
		expect(shiftByClubDays(null, 364)).toBeNull()
	})
})
