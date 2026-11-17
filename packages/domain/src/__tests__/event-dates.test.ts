import {
	dateOrderIssues,
	registrationOpensAt,
	startTimeIssue,
	type EventDates,
} from "../functions/event-dates"
import { EventTypeChoices } from "../types"

// A weeknight event on Wed May 5, 2027: signup Apr 26-May 3, payments end May 4 (club time).
const dates = (overrides: Partial<EventDates> = {}): EventDates => ({
	eventType: EventTypeChoices.WEEKNIGHT,
	startDate: "2027-05-05",
	prioritySignupStart: "2027-04-26T13:00:00.000Z",
	signupStart: "2027-04-27T13:00:00.000Z",
	signupEnd: "2027-05-03T23:00:00.000Z",
	paymentsEnd: "2027-05-04T23:00:00.000Z",
	...overrides,
})

const fields = (d: EventDates) => dateOrderIssues(d).map((i) => i.field)

describe("dateOrderIssues", () => {
	it("accepts dates in order", () => {
		expect(dateOrderIssues(dates())).toEqual([])
	})

	it("skips dates that are not set", () => {
		expect(
			dateOrderIssues(
				dates({ prioritySignupStart: null, signupStart: null, signupEnd: null, paymentsEnd: null }),
			),
		).toEqual([])
	})

	it("skips dates that are not valid, leaving them to the field's format check", () => {
		expect(dateOrderIssues(dates({ signupStart: "not-a-date", paymentsEnd: "" }))).toEqual([])
	})

	it("refuses priority signup after signup start", () => {
		expect(fields(dates({ prioritySignupStart: "2027-04-28T13:00:00.000Z" }))).toEqual([
			"signupStart",
		])
	})

	it("allows priority signup at the same instant as signup start", () => {
		expect(fields(dates({ prioritySignupStart: "2027-04-27T13:00:00.000Z" }))).toEqual([])
	})

	it("refuses signup start at or after signup end", () => {
		expect(fields(dates({ signupEnd: "2027-04-27T13:00:00.000Z" }))).toEqual(["signupEnd"])
	})

	it("refuses payments ending before signup ends", () => {
		expect(fields(dates({ paymentsEnd: "2027-05-03T22:00:00.000Z" }))).toEqual(["paymentsEnd"])
	})

	it("allows a deadline on the event date itself", () => {
		// 4:00 PM on May 5 club time
		expect(fields(dates({ paymentsEnd: "2027-05-05T21:00:00.000Z" }))).toEqual([])
	})

	it("refuses a deadline after the event date in club time", () => {
		// 01:00 UTC May 6 is still May 5 in Chicago; 06:00 UTC May 6 is May 6.
		expect(fields(dates({ paymentsEnd: "2027-05-06T01:00:00.000Z" }))).toEqual([])
		expect(fields(dates({ paymentsEnd: "2027-05-06T06:00:00.000Z" }))).toEqual(["paymentsEnd"])
	})

	it("lets season registration run past its event date", () => {
		expect(
			dateOrderIssues(
				dates({
					eventType: EventTypeChoices.SEASON_REGISTRATION,
					startDate: "2027-01-17",
					prioritySignupStart: null,
					signupStart: "2027-01-17T21:00:00.000Z",
					signupEnd: "2027-05-01T09:59:00.000Z",
					paymentsEnd: null,
				}),
			),
		).toEqual([])
	})

	it("still checks the signup window of season registration", () => {
		expect(
			fields(
				dates({
					eventType: EventTypeChoices.SEASON_REGISTRATION,
					signupEnd: "2027-04-20T13:00:00.000Z",
				}),
			),
		).toEqual(["signupEnd"])
	})
})

describe("startTimeIssue", () => {
	const teeSheet = { startType: "TT", canChoose: true }

	it.each(["2:00 PM", "10:30 am", "2:00PM"])("accepts %s when players choose tee times", (t) => {
		expect(startTimeIssue({ ...teeSheet, startTime: t })).toBeNull()
	})

	it.each([null, "", "Morning Swing", "2 PM", "14:00", "13:00 PM"])(
		"refuses %p when players choose tee times",
		(t) => {
			expect(startTimeIssue({ ...teeSheet, startTime: t })).toMatch(/like 2:00 PM/)
		},
	)

	it("allows free text when players do not choose, or for a shotgun", () => {
		expect(
			startTimeIssue({ startType: "TT", canChoose: false, startTime: "Morning Swing" }),
		).toBeNull()
		expect(startTimeIssue({ startType: "SG", canChoose: true, startTime: "Shotgun" })).toBeNull()
	})
})

describe("registrationOpensAt", () => {
	it("is the priority signup start when there is one", () => {
		expect(registrationOpensAt(dates())).toBe("2027-04-26T13:00:00.000Z")
	})

	it("falls back to the signup start", () => {
		expect(registrationOpensAt(dates({ prioritySignupStart: null }))).toBe(
			"2027-04-27T13:00:00.000Z",
		)
	})
})
