import {
	coursesMissing,
	datesOutOfOrder,
	eventCanceled,
	startTimeInvalid,
	feeDiffers,
	feesMissing,
	noSlots,
	type EventSnapshot,
	type ReadinessEvent,
	type ReadinessFee,
	runChecks,
	scheduleDiffers,
	sessionsMissing,
} from "../checks"

// Weeknight on Wed May 5, 2027: signup opens Mon Apr 26 at 6 PM, closes Tue May 4 at 6 PM (club time).
const evt = (overrides: Partial<ReadinessEvent> = {}): ReadinessEvent => ({
	id: 1,
	name: "Weeknight Stroke",
	season: 2027,
	eventType: "N",
	registrationType: "M",
	startType: "TT",
	canChoose: true,
	status: "S",
	startDate: "2027-05-05",
	startTime: "3:00 PM",
	prioritySignupStart: null,
	signupStart: "2027-04-26T23:00:00.000Z",
	signupEnd: "2027-05-04T23:00:00.000Z",
	paymentsEnd: null,
	...overrides,
})

const cart = (amount: number): ReadinessFee => ({ feeTypeId: 3, feeTypeName: "Cart Fee", amount })

/** A peer one week later with the same schedule. */
const peer = (n: number, overrides: Partial<ReadinessEvent> = {}, fees = [cart(15)]) => {
	const shift = (iso: string | null) =>
		iso ? new Date(Date.parse(iso) + n * 7 * 86_400_000).toISOString() : null
	const base = evt({ id: 100 + n })
	return {
		event: {
			...base,
			startDate: shift(`${base.startDate}T12:00:00.000Z`)!.slice(0, 10),
			signupStart: shift(base.signupStart),
			signupEnd: shift(base.signupEnd),
			...overrides,
		},
		fees,
	}
}

const snapshot = (overrides: Partial<EventSnapshot> = {}): EventSnapshot => ({
	event: evt(),
	fees: [cart(15)],
	courseCount: 2,
	slotCount: 90,
	sessions: [],
	lastSeasonSessions: null,
	peers: [peer(1), peer(2), peer(3)],
	...overrides,
})

const codes = (s: EventSnapshot) => runChecks(s).map((f) => `${f.code}:${f.subject}`)

describe("readiness checks", () => {
	it("finds nothing wrong with a well set-up event", () => {
		expect(runChecks(snapshot())).toEqual([])
	})

	it("reports dates out of order as blocking, on the Dates tab", () => {
		const [f] = datesOutOfOrder(snapshot({ event: evt({ signupEnd: "2027-04-25T23:00:00.000Z" }) }))
		expect(f).toMatchObject({
			code: "dates-out-of-order",
			subject: "signupEnd",
			severity: "blocking",
			tab: "dates",
		})
	})

	it("reports a tee-sheet start time that is not a time", () => {
		const [f] = startTimeInvalid(snapshot({ event: evt({ startTime: "Afternoon" }) }))
		expect(f).toMatchObject({ code: "start-time-invalid", severity: "blocking", tab: "event" })
		expect(f.what).toBe('The start time "Afternoon" is not a time like 2:00 PM')
		expect(
			startTimeInvalid(snapshot({ event: evt({ startTime: "Afternoon", canChoose: false }) })),
		).toEqual([])
	})

	it("reports a canceled event", () => {
		expect(eventCanceled(snapshot({ event: evt({ status: "C" }) }))).toHaveLength(1)
		expect(eventCanceled(snapshot())).toEqual([])
	})

	describe("slots and courses", () => {
		it("are required when players choose tee times or shotgun holes", () => {
			const s = snapshot({ slotCount: 0, courseCount: 0 })
			expect(noSlots(s)).toHaveLength(1)
			expect(coursesMissing(s)).toHaveLength(1)
		})

		it("are not required when players do not choose", () => {
			const s = snapshot({ event: evt({ canChoose: false }), slotCount: 0, courseCount: 0 })
			expect(noSlots(s)).toEqual([])
			expect(coursesMissing(s)).toEqual([])
		})

		it("are not required without a tee-time or shotgun start", () => {
			const s = snapshot({ event: evt({ startType: "NA" }), slotCount: 0, courseCount: 0 })
			expect(noSlots(s)).toEqual([])
			expect(coursesMissing(s)).toEqual([])
		})
	})

	it("requires fees only for events with registration", () => {
		expect(feesMissing(snapshot({ fees: [] }))).toHaveLength(1)
		expect(feesMissing(snapshot({ fees: [], event: evt({ registrationType: "N" }) }))).toEqual([])
	})

	describe("sessions", () => {
		const last = [
			{ name: "Morning Swing", overrideCount: 0 },
			{ name: "Afternoon Swing", overrideCount: 1 },
		]

		it("are required when the event had them last season", () => {
			const [f] = sessionsMissing(snapshot({ lastSeasonSessions: last }))
			expect(f).toMatchObject({ code: "sessions-missing", subject: "", severity: "warning" })
			expect(f.what).toContain("Morning Swing, Afternoon Swing")
		})

		it("report a session that lost its fee overrides", () => {
			const findings = sessionsMissing(
				snapshot({
					lastSeasonSessions: last,
					sessions: [
						{ name: "Morning Swing", overrideCount: 0 },
						{ name: "Afternoon Swing", overrideCount: 0 },
					],
				}),
			)
			expect(findings.map((f) => f.subject)).toEqual(["Afternoon Swing"])
		})

		it("accept sessions that match last season", () => {
			expect(sessionsMissing(snapshot({ lastSeasonSessions: last, sessions: last }))).toEqual([])
		})

		it("are not required for an event that did not run last season, or had none", () => {
			expect(sessionsMissing(snapshot({ lastSeasonSessions: null }))).toEqual([])
			expect(sessionsMissing(snapshot({ lastSeasonSessions: [] }))).toEqual([])
		})
	})

	describe("schedule", () => {
		it("warns when the start time differs from most events of the type", () => {
			const [f] = scheduleDiffers(snapshot({ event: evt({ startTime: "4:00 PM" }) }))
			expect(f).toMatchObject({
				code: "schedule-differs",
				subject: "startTime",
				severity: "warning",
			})
			expect(f.what).toBe("Start time is 4:00 PM; most weeknight events this season use 3:00 PM")
		})

		it("ignores case and spacing in the start time", () => {
			expect(scheduleDiffers(snapshot({ event: evt({ startTime: " 3:00  pm" }) }))).toEqual([])
		})

		it("warns about a different weekday", () => {
			const findings = scheduleDiffers(
				snapshot({
					event: evt({
						startDate: "2027-05-06",
						signupStart: "2027-04-27T23:00:00.000Z",
						signupEnd: "2027-05-05T23:00:00.000Z",
					}),
				}),
			)
			expect(findings.map((f) => f.subject)).toEqual(["weekday"])
		})

		it("warns about a signup offset in club time, and describes it", () => {
			// Opens Tue Apr 27 at 6 PM instead of Mon Apr 26 at 6 PM.
			const [f] = scheduleDiffers(
				snapshot({ event: evt({ signupStart: "2027-04-27T23:00:00.000Z" }) }),
			)
			expect(f.subject).toBe("signupStart")
			expect(f.what).toBe(
				"Signup start is 8 days before the event at 6:00 PM; most weeknight events this season use 9 days before the event at 6:00 PM",
			)
			expect(f.tab).toBe("dates")
		})

		it("needs at least three peers and a majority to compare", () => {
			const odd = evt({ startTime: "4:00 PM" })
			expect(scheduleDiffers(snapshot({ event: odd, peers: [peer(1), peer(2)] }))).toEqual([])
			expect(
				scheduleDiffers(
					snapshot({
						event: odd,
						peers: [peer(1), peer(2, { startTime: "5:00 PM" }), peer(3, { startTime: "5:30 PM" })],
					}),
				),
			).toEqual([])
		})
	})

	describe("fees", () => {
		it("warns when a fee differs from most events of the type", () => {
			const [f] = feeDiffers(snapshot({ fees: [cart(14)] }))
			expect(f).toMatchObject({
				code: "fee-differs",
				subject: "3",
				severity: "warning",
				tab: "fees",
			})
			expect(f.what).toBe("Cart Fee is $14.00; most weeknight events this season charge $15.00")
		})

		it("compares only peers that charge the same fee type", () => {
			const greens = { feeTypeId: 1, feeTypeName: "Greens", amount: 5 }
			expect(feeDiffers(snapshot({ fees: [greens], peers: [peer(1), peer(2), peer(3)] }))).toEqual(
				[],
			)
		})
	})

	it("runs every check", () => {
		expect(
			codes(
				snapshot({ event: evt({ status: "C", startTime: "4:00 PM" }), fees: [], slotCount: 0 }),
			),
		).toEqual(["event-canceled:", "no-slots:", "fees-missing:", "schedule-differs:startTime"])
	})
})
