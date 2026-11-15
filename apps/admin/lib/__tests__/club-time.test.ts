import { fromClubLocalInput, toClubLocalInput } from "../club-time"

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
})
