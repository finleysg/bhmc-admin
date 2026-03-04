import type { ClubEventDetail } from "../types"

import { getGroupStartName } from "../start-name"

function makeEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Weeknight",
		rounds: 1,
		ghin_required: false,
		total_groups: 10,
		status: "S",
		minimum_signup_group_size: 1,
		maximum_signup_group_size: 5,
		group_size: 5,
		start_type: "TT",
		can_choose: true,
		registration_window: "registration",
		external_url: null,
		season: 2026,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: null,
		season_points: null,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2026-03-01",
		start_time: "11:00 AM",
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

test("shotgun: returns hole number + A for startingOrder 0", () => {
	const event = makeEvent({ start_type: "SG" })
	expect(getGroupStartName(event, 5, 0)).toBe("5A")
})

test("shotgun: returns hole number + B for startingOrder 1", () => {
	const event = makeEvent({ start_type: "SG" })
	expect(getGroupStartName(event, 5, 1)).toBe("5B")
})

test("tee times: returns formatted time for startingOrder 0 (base time)", () => {
	const event = makeEvent({ start_type: "TT", start_time: "11:00 AM" })
	expect(getGroupStartName(event, 1, 0)).toBe("11:00 AM")
})

test("tee times: returns offset time for startingOrder > 0 with single split", () => {
	const event = makeEvent({ start_type: "TT", start_time: "11:00 AM", tee_time_splits: null })
	// Default split is 8 minutes; startingOrder 2 → +16 min = 11:16 AM
	expect(getGroupStartName(event, 1, 2)).toBe("11:16 AM")
})

test("tee times: returns offset time with alternating splits", () => {
	const event = makeEvent({ start_type: "TT", start_time: "11:00 AM", tee_time_splits: "8,10" })
	// startingOrder 1 → offset = 8 → 11:08 AM
	expect(getGroupStartName(event, 1, 1)).toBe("11:08 AM")
	// startingOrder 2 → offset = 8 + 10 = 18 → 11:18 AM
	expect(getGroupStartName(event, 1, 2)).toBe("11:18 AM")
	// startingOrder 3 → offset = (8 + 10) + 8 = 26 → 11:26 AM
	expect(getGroupStartName(event, 1, 3)).toBe("11:26 AM")
})
