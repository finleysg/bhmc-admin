import { getAge, getFullName } from "../player.domain"
import { PlayerDomainData } from "../types"

describe("player.domain", () => {
	describe("getFullName", () => {
		it("concatenates first and last name", () => {
			expect(getFullName({ firstName: "John", lastName: "Doe" })).toBe("John Doe")
		})

		it("handles missing first name", () => {
			expect(getFullName({ firstName: null, lastName: "Doe" })).toBe("Doe")
		})

		it("handles missing last name", () => {
			expect(getFullName({ firstName: "John", lastName: null })).toBe("John")
		})

		it("returns empty string when both missing", () => {
			expect(getFullName({ firstName: null, lastName: null })).toBe("")
		})
	})

	describe("getAge", () => {
		it("returns n/a for missing birthDate", () => {
			const res = getAge(
				{ firstName: "A", lastName: "B", birthDate: null },
				new Date("2025-10-18T00:00:00Z"),
			)
			expect(res.age).toBe("n/a")
			expect(res.eventAge).toBe("n/a")
			expect(res.calendarAge).toBe("n/a")
		})

		it("calculates ages correctly when birthday already occurred this year", () => {
			// set system date to 2025-10-18 for deterministic 'age'
			jest.useFakeTimers()
			jest.setSystemTime(new Date("2025-10-18T00:00:00Z"))

			const player: PlayerDomainData = { birthDate: "2000-06-15" }
			const res = getAge(player, new Date("2025-10-18T00:00:00Z"), new Date("2025-11-01"))
			// as of 2025-10-18 (today): 25
			expect(res.age).toBe(25)
			// as of event 2025-11-01: 25
			expect(res.eventAge).toBe(25)
			// calendar age at 2025-12-31: 25
			expect(res.calendarAge).toBe(25)

			// restore
			jest.useRealTimers()
		})

		it("calculates eventAge and calendarAge when birthday hasn't occurred yet", () => {
			// set system date to 2025-10-18
			jest.useFakeTimers()
			jest.setSystemTime(new Date("2025-10-18T00:00:00Z"))

			const player: PlayerDomainData = { birthDate: "2000-12-20" }
			// event on 2025-11-01 -> birthday still in December
			const res = getAge(player, new Date("2025-10-18T00:00:00Z"), new Date("2025-11-01"))

			// today (2025-10-18): age 24
			expect(res.age).toBe(24)
			// eventAge on 2025-11-01: still 24
			expect(res.eventAge).toBe(24)
			// calendarAge at 2025-12-31: 25
			expect(res.calendarAge).toBe(25)

			// restore
			jest.useRealTimers()
		})

		it("handles leap-day birthdays (Feb 29) correctly", () => {
			// set system date to 2025-03-01
			jest.useFakeTimers()
			jest.setSystemTime(new Date("2025-03-01T00:00:00Z"))

			const player: PlayerDomainData = { birthDate: "2004-02-29" }
			const res = getAge(player, new Date("2025-03-01"), new Date("2025-03-01"))

			// 2004 -> 2025: birthday celebrated on Feb 28/Mar1; age = 21
			expect(res.age).toBe(21)
			expect(res.eventAge).toBe(21)
			expect(res.calendarAge).toBe(21)

			// restore
			jest.useRealTimers()
		})
	})
})
