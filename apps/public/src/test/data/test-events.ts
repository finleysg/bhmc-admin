import { addDays, format, subDays } from "date-fns"

const TestEventType = {
	season: 1,
	match: 2,
	major: 3,
	weeknight: 4,
	open: 5,
	guest: 6,
	shotgun: 7,
	deadline: 8,
}

const commonFees = [
	{
		amount: 5,
		display_order: 1,
		event: 4,
		fee_type: { id: 5, name: "Event Fee", code: "E", restriction: "None" },
		id: 5,
		is_required: true,
	},
	{
		amount: 5,
		display_order: 2,
		event: 4,
		fee_type: { id: 8, name: "Gross Skins", code: "GS", restriction: "None" },
		id: 8,
		is_required: false,
	},
	{
		amount: 5,
		display_order: 3,
		event: 4,
		fee_type: { id: 9, name: "Net Skins", code: "NS", restriction: "None" },
		id: 9,
		is_required: false,
	},
	{
		amount: 20,
		display_order: 4,
		event: 4,
		fee_type: { id: 10, name: "Greens Fee", code: "GF", restriction: "None" },
		id: 10,
		is_required: false,
	},
	{
		amount: 10,
		display_order: 5,
		event: 4,
		fee_type: { id: 11, name: "Cart Fee", code: "CF", restriction: "None" },
		id: 11,
		is_required: false,
	},
]

const nineHoleCourses = [
	{
		id: 1,
		name: "East",
		number_of_holes: 9,
		holes: [
			{
				id: 1,
				course: 1,
				hole_number: 1,
				par: 4,
			},
			{
				id: 2,
				course: 1,
				hole_number: 2,
				par: 4,
			},
			{
				id: 3,
				course: 1,
				hole_number: 3,
				par: 3,
			},
			{
				id: 4,
				course: 1,
				hole_number: 4,
				par: 5,
			},
			{
				id: 5,
				course: 1,
				hole_number: 5,
				par: 4,
			},
			{
				id: 6,
				course: 1,
				hole_number: 6,
				par: 5,
			},
			{
				id: 7,
				course: 1,
				hole_number: 7,
				par: 3,
			},
			{
				id: 8,
				course: 1,
				hole_number: 8,
				par: 4,
			},
			{
				id: 9,
				course: 1,
				hole_number: 9,
				par: 4,
			},
		],
	},
	{
		id: 2,
		name: "North",
		number_of_holes: 9,
		holes: [
			{
				id: 10,
				course: 2,
				hole_number: 1,
				par: 4,
			},
			{
				id: 11,
				course: 2,
				hole_number: 2,
				par: 4,
			},
			{
				id: 12,
				course: 2,
				hole_number: 3,
				par: 4,
			},
			{
				id: 13,
				course: 2,
				hole_number: 4,
				par: 5,
			},
			{
				id: 14,
				course: 2,
				hole_number: 5,
				par: 4,
			},
			{
				id: 15,
				course: 2,
				hole_number: 6,
				par: 3,
			},
			{
				id: 16,
				course: 2,
				hole_number: 7,
				par: 4,
			},
			{
				id: 17,
				course: 2,
				hole_number: 8,
				par: 3,
			},
			{
				id: 18,
				course: 2,
				hole_number: 9,
				par: 5,
			},
		],
	},
	{
		id: 3,
		name: "West",
		number_of_holes: 9,
		holes: [
			{
				id: 19,
				course: 3,
				hole_number: 1,
				par: 4,
			},
			{
				id: 20,
				course: 3,
				hole_number: 2,
				par: 5,
			},
			{
				id: 21,
				course: 3,
				hole_number: 3,
				par: 3,
			},
			{
				id: 22,
				course: 3,
				hole_number: 4,
				par: 4,
			},
			{
				id: 23,
				course: 3,
				hole_number: 5,
				par: 5,
			},
			{
				id: 24,
				course: 3,
				hole_number: 6,
				par: 4,
			},
			{
				id: 25,
				course: 3,
				hole_number: 7,
				par: 4,
			},
			{
				id: 26,
				course: 3,
				hole_number: 8,
				par: 3,
			},
			{
				id: 27,
				course: 3,
				hole_number: 9,
				par: 4,
			},
		],
	},
]

const SeasonRegistrationEvent = {
	id: TestEventType.season,
	name: "Test Season Signup",
	ghin_required: false,
	minimum_signup_group_size: 1,
	maximum_signup_group_size: 1,
	can_choose: false,
	registration_window: "registration",
	notes: "notes",
	event_type: "R",
	age_restriction_type: "N",
	start_date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
	start_time: "Open",
	registration_type: "O",
	signup_start: subDays(new Date(), 1).toISOString(),
	signup_end: addDays(new Date(), 7).toISOString(),
	registration_maximum: 450,
	status: "S",
	// courses: [],
	fees: [
		{
			id: 1,
			event: 1,
			fee_type: {
				id: 1,
				name: "Returning Member Dues",
				code: "RMD",
				restriction: "Returning Members",
			},
			amount: 90,
			is_required: true,
			display_order: 1,
		},
		{
			id: 2,
			event: 1,
			fee_type: { id: 2, name: "New Member Dues", code: "NMD", restriction: "New Members" },
			amount: 105,
			is_required: true,
			display_order: 2,
		},
		{
			id: 3,
			event: 1,
			fee_type: { id: 3, name: "Patron Card", code: "PC", restriction: "Non-Seniors" },
			amount: 55,
			is_required: false,
			display_order: 3,
		},
		{
			id: 4,
			event: 1,
			fee_type: { id: 4, name: "Sr. Patron Card", code: "SPC", restriction: "Seniors" },
			amount: 32,
			is_required: false,
			display_order: 4,
		},
	],
}

const MatchPlayEvent = {
	can_choose: false,
	courses: [],
	event_type: "O",
	age_restriction_type: "N",
	fees: [
		{
			amount: 30,
			display_order: 1,
			event: 2,
			fee_type: { id: 5, name: "Event Fee", code: "E", restriction: "None" },
			id: 5,
			is_required: true,
		},
		{
			amount: 0,
			display_order: 2,
			event: 2,
			fee_type: { id: 6, name: "Gross Division (no handicap)", code: "GD", restriction: "None" },
			id: 6,
			is_required: false,
		},
		{
			amount: 0,
			display_order: 3,
			event: 2,
			fee_type: { id: 7, name: "Net Division (no handicap)", code: "ND", restriction: "None" },
			id: 7,
			is_required: false,
		},
	],
	ghin_required: true,
	id: TestEventType.match,
	maximum_signup_group_size: 1,
	minimum_signup_group_size: 1,
	name: "Test Season Long Match Play",
	notes: "",
	registration_type: "M",
	registration_window: "registration",
	season: 2021,
	signup_end: "2021-04-25T18:00:00-05:00",
	signup_start: "2021-01-10T06:00:00-06:00",
	start_date: "2021-05-01",
	start_time: "Make Your Own Tee Times",
	start_type: "NA",
	status: "S",
}

const MajorEvent = {
	can_choose: false,
	event_type: "W",
	age_restriction_type: "N",
	fees: commonFees,
	ghin_required: true,
	group_size: 4,
	id: TestEventType.major,
	maximum_signup_group_size: 4,
	minimum_signup_group_size: 1,
	name: "Test Major",
	notes: "",
	payments_end: "2021-04-25T18:00:00-05:00",
	registration_maximum: 100,
	registration_type: "M",
	registration_window: "registration",
	rounds: 1,
	season: 2021,
	season_points: 60,
	signup_end: "2021-04-25T18:00:00-05:00",
	signup_start: "2021-01-10T06:00:00-06:00",
	skins_type: "I",
	start_date: "2021-05-01",
	start_time: "Morning Swing",
	start_type: "TT",
	status: "S",
}

const WeeknightTeetimeEvent = {
	can_choose: true,
	courses: nineHoleCourses,
	event_type: "N",
	age_restriction_type: "N",
	fees: commonFees,
	ghin_required: true,
	group_size: 5,
	id: TestEventType.weeknight,
	maximum_signup_group_size: 5,
	minimum_signup_group_size: 1,
	name: "Test Weeknight Event",
	notes: "",
	payments_end: "2021-04-25T18:00:00-05:00",
	registration_type: "M",
	registration_window: "registration",
	rounds: 1,
	season: 2021,
	season_points: 30,
	signup_end: "2021-04-25T18:00:00-05:00",
	signup_start: "2021-01-10T06:00:00-06:00",
	skins_type: "I",
	start_date: "2021-05-01",
	start_time: "3:00 PM",
	start_type: "TT",
	total_groups: 20,
	status: "S",
}

const OpenEvent = {
	can_choose: false,
	event_type: "O",
	age_restriction_type: "N",
	fees: commonFees,
	ghin_required: true,
	group_size: 4,
	id: TestEventType.open,
	maximum_signup_group_size: 4,
	minimum_signup_group_size: 1,
	name: "Test Open Event",
	notes: "",
	payments_end: "2021-04-25T18:00:00-05:00",
	registration_maximum: 100,
	registration_type: "O",
	registration_window: "registration",
	rounds: 1,
	season: 2021,
	season_points: 0,
	signup_end: "2021-04-25T18:00:00-05:00",
	signup_start: "2021-01-10T06:00:00-06:00",
	skins_type: "I",
	start_date: "2021-05-01",
	start_time: "Morning Swing",
	start_type: "TT",
	status: "S",
}

const MemberGuestEvent = {
	can_choose: false,
	event_type: "O",
	age_restriction_type: "N",
	fees: commonFees,
	ghin_required: false,
	group_size: 4,
	id: TestEventType.guest,
	maximum_signup_group_size: 4,
	minimum_signup_group_size: 2,
	name: "Test Member Guest",
	notes: "",
	payments_end: "2021-04-25T18:00:00-05:00",
	registration_maximum: 100,
	registration_type: "G",
	registration_window: "registration",
	rounds: 1,
	season: 2021,
	signup_end: "2021-04-25T18:00:00-05:00",
	signup_start: "2021-01-10T06:00:00-06:00",
	skins_type: "I",
	start_date: "2021-05-01",
	start_time: "1:00 PM",
	start_type: "SG",
	status: "S",
}

const WeeknightShotgunEvent = {
	id: TestEventType.shotgun,
	name: "Individual LG/LN",
	rounds: 1,
	ghin_required: true,
	total_groups: 20,
	minimum_signup_group_size: 1,
	maximum_signup_group_size: 5,
	group_size: 5,
	start_type: "SG",
	can_choose: true,
	registration_window: "registration",
	season: 2021,
	notes: "Test event",
	event_type: "N",
	age_restriction_type: "N",
	skins_type: "I",
	season_points: 30,
	start_date: "2021-02-01",
	start_time: "3:00 PM",
	registration_type: "M",
	signup_start: "2021-01-17T16:00:00-06:00",
	signup_end: "2021-01-31T18:00:00-06:00",
	payments_end: "2021-01-31T18:00:00-06:00",
	status: "S",
	courses: nineHoleCourses,
	fees: commonFees,
}

const DeadlineEvent = {
	can_choose: false,
	event_type: "O",
	age_restriction_type: "N",
	ghin_required: false,
	group_size: 4,
	id: TestEventType.deadline,
	maximum_signup_group_size: 4,
	minimum_signup_group_size: 2,
	name: "Test Deadline",
	notes: "",
	registration_type: "N",
	registration_window: "n/a",
	season: 2021,
	start_date: "2021-05-01",
	status: "S",
}

const getEvent = (eventType: number) => {
	switch (eventType) {
		case TestEventType.season:
			return SeasonRegistrationEvent
		case TestEventType.match:
			return MatchPlayEvent
		case TestEventType.major:
			return MajorEvent
		case TestEventType.weeknight:
			return WeeknightTeetimeEvent
		case TestEventType.open:
			return OpenEvent
		case TestEventType.guest:
			return MemberGuestEvent
		case TestEventType.shotgun:
			return WeeknightShotgunEvent
		case TestEventType.deadline:
			return DeadlineEvent
		default:
			throw "unsupported"
	}
}

type dateFieldTypes = {
	start_date: string
	priority_signup_start: string | null
	signup_start: string
	signup_end: string
	payments_end: string
	registration_window: string
	season: number
	signup_waves: number | null
}

const getTestEvent = (eventType: number, state: string = "registration") => {
	let now = new Date()
	if (state === "future") {
		now = addDays(now, 30)
	} else if (state === "past") {
		now = subDays(now, 30)
	} else {
		now = addDays(now, 7)
	}
	const dateFields: dateFieldTypes = {
		start_date: format(now, "yyyy-MM-dd"),
		priority_signup_start: null,
		signup_start: subDays(now, 14).toISOString(),
		signup_end: subDays(now, 4).toISOString(),
		payments_end: subDays(now, 1).toISOString(),
		registration_window: state,
		season: now.getFullYear(),
		signup_waves: null,
	}
	return Object.assign(getEvent(eventType), dateFields)
}

const getTestEvents = () => {
	return [
		getTestEvent(TestEventType.season),
		getTestEvent(TestEventType.match),
		getTestEvent(TestEventType.major, "future"),
		getTestEvent(TestEventType.weeknight, "future"),
		getTestEvent(TestEventType.open, "future"),
		getTestEvent(TestEventType.guest, "past"),
		getTestEvent(TestEventType.shotgun, "past"),
		getTestEvent(TestEventType.deadline, "future"),
	]
}

export { TestEventType, getTestEvent, getTestEvents }
