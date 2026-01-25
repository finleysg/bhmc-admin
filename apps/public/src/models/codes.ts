export enum AdminPaymentDetailAction {
	Add,
	Remove,
	None,
}

export const AgeRestrictionType = {
	None: "N",
	Over: "O",
	Under: "U",
} as const

export const ageRestrictionTypeMap = new Map([
	["N", "None"],
	["O", "Over"],
	["U", "Under"],
])

export const DocumentType = {
	Results: "R",
	Teetimes: "T",
	Flights: "L",
	Points: "P",
	DamCup: "D",
	MatchPlay: "M",
	Finance: "F",
	SignUp: "S",
	Data: "Z",
	Other: "O",
} as const

export const documentTypeMap = new Map([
	["D", "Dam Cup"],
	["Z", "Data"],
	["L", "Event Flights"],
	["R", "Event Results"],
	["S", "Event Sign Up"],
	["T", "Event Tee Times"],
	["F", "Financial Statements"],
	["M", "Match Play"],
	["O", "Other"],
	["P", "Season Long Points"],
])

export const RegistrationType = {
	MembersOnly: "M",
	GuestsAllowed: "G",
	Open: "O",
	ReturningMembersOnly: "R",
	None: "N",
} as const

export const EventType = {
	Weeknight: "N",
	Major: "W",
	MatchPlay: "S",
	Meeting: "M",
	Other: "O",
	External: "E",
	Membership: "R",
	Deadline: "D",
	Open: "P",
	Invitational: "I",
} as const

export const SkinsType = {
	Individual: "I",
	Team: "T",
	None: "N",
} as const

export const StartType = {
	Shotgun: "SG",
	TeeTimes: "TT",
	NA: "NA",
} as const

export const EventStatusType = {
	Scheduled: "S",
	Canceled: "C",
	Tentative: "T",
} as const

export const FeeRestriction = {
	Members: "Members",
	ReturningMembers: "Returning Members",
	NewMembers: "New Members",
	Seniors: "Seniors",
	NonSeniors: "Non-Seniors",
	NonMembers: "Non-Members",
	None: "None",
} as const

export const RegistrationStatus = {
	Available: "A",
	InProgress: "P",
	Reserved: "R",
	Processing: "X",
	Unavailable: "U",
} as const

export const AnnouncementVisibility = {
	MembersOnly: "M",
	NonMembers: "N",
	All: "A",
} as const

export const Groups = {
	Guests: "Guests",
	AuthenticatedUsers: "Authenticated Users",
	Administrators: "Administrators",
	PaulHelpers: "Paul Helpers",
	TournamentAdmins: "Tournament Admins",
} as const

export const PolicyType = {
	Policy: "P",
	LocalRule: "R",
	Scoring: "S",
	NewMembers: "N",
	AboutUs: "A",
	Paymnts: "F",
} as const

export const getEventTypeName = (code: string) => {
	switch (code) {
		case EventType.Weeknight:
			return "Weeknight Event"
		case EventType.Major:
			return "Weekend Major"
		case EventType.MatchPlay:
			return "Season Long Match Play"
		case EventType.Meeting:
			return "Meeting"
		case EventType.Other:
			return "Other"
		case EventType.External:
			return "External Event"
		case EventType.Membership:
			return "Season Registration"
		case EventType.Deadline:
			return "Deadline"
		case EventType.Open:
			return "Open Event"
		case EventType.Invitational:
			return "Invitational"
		default:
			return "Unknown"
	}
}

export const getStatusName = (statusCode: string) => {
	switch (statusCode) {
		case RegistrationStatus.Available:
			return "Available"
		case RegistrationStatus.InProgress:
			return "In Progress"
		case RegistrationStatus.Reserved:
			return "Reserved"
		case RegistrationStatus.Processing:
			return "Payment Processing"
		default:
			return "Unavailable"
	}
}

export const getStartTypeName = (startType?: string | null) => {
	if (!startType) {
		return ""
	}
	switch (startType) {
		case StartType.Shotgun:
			return "Shotgun"
		case StartType.TeeTimes:
			return "Teetimes"
		default:
			return ""
	}
}

export const getRegistrationTypeName = (registrationType: string) => {
	switch (registrationType) {
		case RegistrationType.MembersOnly:
			return "Members Only"
		case RegistrationType.GuestsAllowed:
			return "Guests Allowed"
		case RegistrationType.Open:
			return "Open to All"
		case RegistrationType.ReturningMembersOnly:
			return "Returning Members Only"
		case RegistrationType.None:
			return "N/A"
		default:
			return ""
	}
}
