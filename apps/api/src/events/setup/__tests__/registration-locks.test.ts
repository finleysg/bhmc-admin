import { lockedSettingChanges, registrationHasOpened } from "../registration-locks"

const now = new Date("2027-04-30T12:00:00.000Z")

const settings = (overrides: Record<string, unknown> = {}) => ({
	name: "Weeknight Stroke",
	notes: null,
	status: "S",
	registrationType: "M",
	canChoose: true,
	groupSize: 5,
	startDate: "2027-05-05",
	startTime: "3:00 PM",
	prioritySignupStart: "2027-04-26T14:00:00.000Z",
	signupStart: "2027-04-28T14:00:00.000Z",
	signupEnd: "2027-05-04T17:00:00.000Z",
	paymentsEnd: "2027-05-04T22:00:00.000Z",
	...overrides,
})

describe("registrationHasOpened", () => {
	it("opens at the priority signup start, or the signup start", () => {
		expect(
			registrationHasOpened({ prioritySignupStart: "2027-04-26 14:00:00", signupStart: null }, now),
		).toBe(true)
		expect(
			registrationHasOpened({ prioritySignupStart: null, signupStart: "2027-05-01 14:00:00" }, now),
		).toBe(false)
		expect(registrationHasOpened({ prioritySignupStart: null, signupStart: null }, now)).toBe(false)
	})
})

describe("lockedSettingChanges", () => {
	it("allows notes, name, and status", () => {
		expect(
			lockedSettingChanges(
				settings(),
				settings({ name: "Renamed", notes: "Bring a towel", status: "C" }),
				now,
			),
		).toEqual([])
	})

	it("locks how registration works and players' start times", () => {
		expect(
			lockedSettingChanges(
				settings(),
				settings({ canChoose: false, groupSize: 4, startDate: "2027-05-06", startTime: "4:00 PM" }),
				now,
			),
		).toEqual(["whether players choose their slots", "group size", "event date", "start time"])
	})

	it("locks the signup start", () => {
		expect(
			lockedSettingChanges(settings(), settings({ signupStart: "2027-04-29T14:00:00.000Z" }), now),
		).toEqual(["signup start"])
	})

	it("lets signup end and payments end move, as long as they stay in the future", () => {
		expect(
			lockedSettingChanges(settings(), settings({ signupEnd: "2027-05-04T20:00:00.000Z" }), now),
		).toEqual([])
		expect(
			lockedSettingChanges(
				settings(),
				settings({ signupEnd: "2027-04-29T20:00:00.000Z", paymentsEnd: null }),
				now,
			),
		).toEqual([
			"signup end (removed or moved into the past)",
			"payments end (removed or moved into the past)",
		])
	})
})
