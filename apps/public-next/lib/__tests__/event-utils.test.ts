import {
	EventType,
	RegistrationType,
	getEventTypeName,
	getStartTypeName,
	getRegistrationTypeName,
	getEventTypeColor,
	getEventUrl,
	findEventBySlug,
	computeOpenSpots,
	shouldShowSignUpButton,
	getSignUpUnavailableReason,
} from "../event-utils"
import type { ClubEvent, ClubEventDetail, RegistrationSlot } from "../types"

function makeEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Wednesday Weeknight",
		rounds: 1,
		ghin_required: false,
		total_groups: null,
		status: "S",
		minimum_signup_group_size: null,
		maximum_signup_group_size: null,
		group_size: 4,
		start_type: "TT",
		can_choose: true,
		registration_window: "future",
		external_url: null,
		season: 2024,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: null,
		season_points: 1,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2024-06-15",
		start_time: "3:00 PM",
		registration_type: "M",
		signup_start: null,
		signup_end: null,
		signup_waves: null,
		payments_end: null,
		registration_maximum: null,
		courses: [],
		fees: [],
		default_tag: null,
		starter_time_interval: 8,
		team_size: null,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

function makeSlot(overrides: Partial<RegistrationSlot> = {}): RegistrationSlot {
	return {
		id: 1,
		event: 1,
		registration: 1,
		hole: null,
		starting_order: 0,
		slot: 0,
		status: "R",
		player: null,
		...overrides,
	}
}

describe("getEventTypeName", () => {
	it.each([
		[EventType.Weeknight, "Weeknight Event"],
		[EventType.Major, "Weekend Major"],
		[EventType.MatchPlay, "Season Long Match Play"],
		[EventType.Meeting, "Meeting"],
		[EventType.Other, "Other"],
		[EventType.External, "External Event"],
		[EventType.Membership, "Season Registration"],
		[EventType.Deadline, "Deadline"],
		[EventType.Open, "Open Event"],
		[EventType.Invitational, "Invitational"],
	])("returns correct name for code %s", (code, expected) => {
		expect(getEventTypeName(code)).toBe(expected)
	})

	it("returns 'Unknown' for unrecognized code", () => {
		expect(getEventTypeName("X")).toBe("Unknown")
	})
})

describe("getStartTypeName", () => {
	it("returns 'Shotgun' for SG", () => {
		expect(getStartTypeName("SG")).toBe("Shotgun")
	})

	it("returns 'Tee Times' for TT", () => {
		expect(getStartTypeName("TT")).toBe("Tee Times")
	})

	it("returns empty string for null/undefined", () => {
		expect(getStartTypeName(null)).toBe("")
		expect(getStartTypeName(undefined)).toBe("")
	})

	it("returns empty string for unknown code", () => {
		expect(getStartTypeName("XX")).toBe("")
	})
})

describe("getRegistrationTypeName", () => {
	it.each([
		[RegistrationType.MembersOnly, "Members Only"],
		[RegistrationType.GuestsAllowed, "Guests Allowed"],
		[RegistrationType.Open, "Open"],
		[RegistrationType.ReturningMembersOnly, "Returning Members Only"],
		[RegistrationType.None, ""],
	])("returns correct name for code %s", (code, expected) => {
		expect(getRegistrationTypeName(code)).toBe(expected)
	})

	it("returns empty string for null/undefined", () => {
		expect(getRegistrationTypeName(null)).toBe("")
		expect(getRegistrationTypeName(undefined)).toBe("")
	})
})

describe("getEventTypeColor", () => {
	it("returns muted variant when muted=true", () => {
		const result = getEventTypeColor(EventType.Weeknight, true)
		expect(result).toContain("bg-primary/20")
	})

	it("returns non-muted variant by default", () => {
		const result = getEventTypeColor(EventType.Weeknight)
		expect(result).toContain("bg-primary/80")
	})

	it("returns muted-foreground for unknown codes", () => {
		expect(getEventTypeColor("X")).toContain("bg-muted")
	})
})

describe("getEventUrl", () => {
	it("builds a URL from event date and slugified name", () => {
		const event = makeEvent({ start_date: "2024-06-15", name: "Wednesday Weeknight" })
		expect(getEventUrl(event)).toBe("/event/2024-06-15/wednesday-weeknight")
	})

	it("returns '#' for invalid start_date", () => {
		const event = makeEvent({ start_date: "not-a-date" })
		expect(getEventUrl(event)).toBe("#")
	})

	it("works with ClubEvent (minimal) type", () => {
		const event: ClubEvent = {
			id: 1,
			event_type: "N",
			name: "Weeknight",
			season: 2024,
			start_date: "2024-07-10",
			status: "S",
		}
		expect(getEventUrl(event)).toBe("/event/2024-07-10/weeknight")
	})
})

describe("findEventBySlug", () => {
	const events = [
		makeEvent({ id: 1, name: "Wednesday Weeknight", start_date: "2024-06-05" }),
		makeEvent({ id: 2, name: "Best Ball/Scramble", start_date: "2024-06-15" }),
		makeEvent({ id: 3, name: "Wednesday Weeknight", start_date: "2024-06-19" }),
	]

	it("finds an event by date and name slug", () => {
		const result = findEventBySlug(events, "2024-06-15", "best-ball-scramble")
		expect(result?.id).toBe(2)
	})

	it("distinguishes events with the same name by date", () => {
		const result = findEventBySlug(events, "2024-06-19", "wednesday-weeknight")
		expect(result?.id).toBe(3)
	})

	it("returns undefined when no match", () => {
		expect(findEventBySlug(events, "2024-06-15", "nonexistent")).toBeUndefined()
	})

	it("returns undefined for empty array", () => {
		expect(findEventBySlug([], "2024-06-15", "anything")).toBeUndefined()
	})
})

describe("computeOpenSpots", () => {
	describe("when can_choose is true (tee time selection)", () => {
		const event = makeEvent({ can_choose: true })

		it("counts slots with status 'A' as available", () => {
			const slots = [
				makeSlot({ status: "A" }),
				makeSlot({ status: "A" }),
				makeSlot({ status: "R" }),
			]
			expect(computeOpenSpots(event, slots)).toBe(2)
		})

		it("returns 0 when all slots are filled", () => {
			const slots = [makeSlot({ status: "R" }), makeSlot({ status: "R" })]
			expect(computeOpenSpots(event, slots)).toBe(0)
		})

		it("returns total count when all slots are available", () => {
			const slots = [makeSlot({ status: "A" }), makeSlot({ status: "A" })]
			expect(computeOpenSpots(event, slots)).toBe(2)
		})
	})

	describe("when can_choose is false (no tee time selection)", () => {
		it("uses registration_maximum minus filled slots", () => {
			const event = makeEvent({ can_choose: false, registration_maximum: 40 })
			const slots = [
				makeSlot({ status: "R" }),
				makeSlot({ status: "R" }),
				makeSlot({ status: "R" }),
			]
			expect(computeOpenSpots(event, slots)).toBe(37)
		})

		it("returns -1 when no registration_maximum", () => {
			const event = makeEvent({ can_choose: false, registration_maximum: null })
			const slots = [makeSlot({ status: "R" })]
			expect(computeOpenSpots(event, slots)).toBe(-1)
		})

		it("only counts status 'R' as filled", () => {
			const event = makeEvent({ can_choose: false, registration_maximum: 10 })
			const slots = [
				makeSlot({ status: "R" }),
				makeSlot({ status: "A" }),
				makeSlot({ status: "P" }),
			]
			expect(computeOpenSpots(event, slots)).toBe(9)
		})
	})

	it("handles empty slots array", () => {
		const event = makeEvent({ can_choose: true })
		expect(computeOpenSpots(event, [])).toBe(0)
	})
})

describe("shouldShowSignUpButton", () => {
	const now = new Date("2024-06-15T12:00:00")

	describe("hidden when", () => {
		it("registration_type is None", () => {
			const event = makeEvent({ registration_type: RegistrationType.None })
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("registration_window is past", () => {
			const event = makeEvent({ registration_window: "past" })
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("status is canceled", () => {
			const event = makeEvent({ status: "C" })
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})
	})

	describe("can_choose events (tee-time selection)", () => {
		it("returns false when more than 60 minutes before signup", () => {
			const event = makeEvent({
				can_choose: true,
				signup_start: "2024-06-15T14:01:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("returns false when 61 minutes before signup", () => {
			const event = makeEvent({
				can_choose: true,
				signup_start: "2024-06-15T13:01:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("returns true when exactly 60 minutes before signup", () => {
			const event = makeEvent({
				can_choose: true,
				signup_start: "2024-06-15T13:00:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})

		it("returns true when 30 minutes before signup", () => {
			const event = makeEvent({
				can_choose: true,
				signup_start: "2024-06-15T12:30:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})

		it("returns true when registration_window is registration", () => {
			const event = makeEvent({
				can_choose: true,
				registration_window: "registration",
				signup_start: "2024-06-15T11:00:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})

		it("returns true when no signup_start and window is registration", () => {
			const event = makeEvent({
				can_choose: true,
				registration_window: "registration",
				signup_start: null,
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})

		it("returns false when no signup_start and window is future", () => {
			const event = makeEvent({
				can_choose: true,
				registration_window: "future",
				signup_start: null,
			})
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("uses priority_signup_start over signup_start when both set", () => {
			const event = makeEvent({
				can_choose: true,
				priority_signup_start: "2024-06-15T12:30:00",
				signup_start: "2024-06-15T15:00:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})
	})

	describe("non can_choose events", () => {
		it("returns false when registration_window is future", () => {
			const event = makeEvent({
				can_choose: false,
				registration_window: "future",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})

		it("returns true when registration_window is registration", () => {
			const event = makeEvent({
				can_choose: false,
				registration_window: "registration",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(true)
		})

		it("ignores time-based logic", () => {
			const event = makeEvent({
				can_choose: false,
				registration_window: "future",
				signup_start: "2024-06-15T12:30:00",
			})
			expect(shouldShowSignUpButton(event, now)).toBe(false)
		})
	})
})

describe("getSignUpUnavailableReason", () => {
	const defaults = {
		isAuthenticated: true,
		hasSignedUp: false,
		playerLastSeason: 2025,
	}

	function openEvent(overrides: Partial<ClubEventDetail> = {}) {
		return makeEvent({
			registration_type: "M",
			registration_window: "registration",
			status: "S",
			can_choose: false,
			signup_start: "2024-06-15T11:00:00",
			season: 2026,
			...overrides,
		})
	}

	it("returns null when signup button should be showing", () => {
		const event = openEvent()
		expect(getSignUpUnavailableReason({ event, ...defaults })).toBeNull()
	})

	describe("event state reasons (take priority over user state)", () => {
		it("returns message for registration type None", () => {
			const event = openEvent({ registration_type: RegistrationType.None })
			expect(getSignUpUnavailableReason({ event, ...defaults })).toBe(
				"Online registration is not available for this event.",
			)
		})

		it("returns message for canceled event", () => {
			const event = openEvent({ status: "C" })
			expect(getSignUpUnavailableReason({ event, ...defaults })).toBe(
				"This event has been canceled.",
			)
		})

		it("returns message for closed registration", () => {
			const event = openEvent({ registration_window: "past" })
			expect(getSignUpUnavailableReason({ event, ...defaults })).toBe("Registration is closed.")
		})

		it("returns message with date for future registration", () => {
			const event = openEvent({
				registration_window: "future",
				can_choose: false,
				signup_start: "2026-06-15T17:00:00",
			})
			const result = getSignUpUnavailableReason({ event, ...defaults })
			expect(result).toMatch(/^Registration opens /)
		})

		it("returns generic message when future but no signup_start", () => {
			const event = openEvent({
				registration_window: "future",
				can_choose: false,
				signup_start: null,
			})
			expect(getSignUpUnavailableReason({ event, ...defaults })).toBe(
				"Registration is not yet open.",
			)
		})
	})

	describe("priority: event state over user state", () => {
		it("shows 'closed' instead of 'sign in' for anonymous user on past event", () => {
			const event = openEvent({ registration_window: "past" })
			expect(
				getSignUpUnavailableReason({ event, isAuthenticated: false, hasSignedUp: false }),
			).toBe("Registration is closed.")
		})

		it("shows 'canceled' instead of 'sign in' for anonymous user on canceled event", () => {
			const event = openEvent({ status: "C" })
			expect(
				getSignUpUnavailableReason({ event, isAuthenticated: false, hasSignedUp: false }),
			).toBe("This event has been canceled.")
		})

		it("shows 'not available' instead of 'sign in' for no-registration event", () => {
			const event = openEvent({ registration_type: RegistrationType.None })
			expect(
				getSignUpUnavailableReason({ event, isAuthenticated: false, hasSignedUp: false }),
			).toBe("Online registration is not available for this event.")
		})

		it("shows future date instead of 'sign in' for anonymous user on future event", () => {
			const event = openEvent({
				registration_window: "future",
				can_choose: false,
				signup_start: "2026-06-15T17:00:00",
			})
			const result = getSignUpUnavailableReason({
				event,
				isAuthenticated: false,
				hasSignedUp: false,
			})
			expect(result).toMatch(/^Registration opens /)
		})
	})

	describe("user state reasons", () => {
		it("returns message for unauthenticated user on open event", () => {
			const event = openEvent()
			expect(
				getSignUpUnavailableReason({ event, isAuthenticated: false, hasSignedUp: false }),
			).toBe("Sign in to register for this event.")
		})

		it("returns message for already registered user", () => {
			const event = openEvent()
			expect(getSignUpUnavailableReason({ event, ...defaults, hasSignedUp: true })).toBe(
				"You are signed up.",
			)
		})

		it("returns message for returning members only when not eligible", () => {
			const event = openEvent({
				registration_type: RegistrationType.ReturningMembersOnly,
				season: 2026,
			})
			expect(
				getSignUpUnavailableReason({ event, ...defaults, playerLastSeason: 2024 }),
			).toBe("This event is restricted to returning members.")
		})

		it("returns null for returning members only when eligible", () => {
			const event = openEvent({
				registration_type: RegistrationType.ReturningMembersOnly,
				season: 2026,
			})
			expect(
				getSignUpUnavailableReason({ event, ...defaults, playerLastSeason: 2025 }),
			).toBeNull()
		})

		it("returns null for returning members only with null last_season", () => {
			const event = openEvent({
				registration_type: RegistrationType.ReturningMembersOnly,
				season: 2026,
			})
			expect(
				getSignUpUnavailableReason({ event, ...defaults, playerLastSeason: null }),
			).toBe("This event is restricted to returning members.")
		})
	})
})
