import {
	clubWallClock,
	dateOrderIssues,
	formatTime,
	getEventTypeName,
	startTimeIssue,
} from "@repo/domain/functions"
import {
	EventStatusChoices,
	type EventTypeValue,
	type ReadinessFinding,
	RegistrationTypeChoices,
	StartTypeChoices,
} from "@repo/domain/types"

/** An event's fields the checks read. Datetimes are ISO strings. */
export interface ReadinessEvent {
	id: number
	name: string
	season: number
	eventType: EventTypeValue
	registrationType: string
	startType: string | null
	canChoose: boolean
	status: string
	startDate: string
	startTime: string | null
	prioritySignupStart: string | null
	signupStart: string | null
	signupEnd: string | null
	paymentsEnd: string | null
}

export interface ReadinessFee {
	feeTypeId: number
	feeTypeName: string
	amount: number
}

export interface ReadinessSession {
	name: string
	/** How many event fees this session overrides. */
	overrideCount: number
}

/** Everything the checks need to judge one event. */
export interface EventSnapshot {
	event: ReadinessEvent
	fees: ReadinessFee[]
	courseCount: number
	slotCount: number
	sessions: ReadinessSession[]
	/** Sessions of the same event last season, or null if it did not run then. */
	lastSeasonSessions: ReadinessSession[] | null
	/** Other events of the same type this season that are not canceled. */
	peers: { event: ReadinessEvent; fees: ReadinessFee[] }[]
}

export type Finding = Omit<ReadinessFinding, "dismissed">

/** Peer comparisons need this many peers, and a value most of them share. */
const MIN_PEERS = 3

export function runChecks(s: EventSnapshot): Finding[] {
	return [
		...datesOutOfOrder(s),
		...startTimeInvalid(s),
		...eventCanceled(s),
		...noSlots(s),
		...coursesMissing(s),
		...feesMissing(s),
		...sessionsMissing(s),
		...scheduleDiffers(s),
		...feeDiffers(s),
	]
}

const playersChooseSlots = (e: ReadinessEvent) =>
	e.canChoose &&
	(e.startType === StartTypeChoices.TEETIMES || e.startType === StartTypeChoices.SHOTGUN)

export function datesOutOfOrder({ event }: EventSnapshot): Finding[] {
	return dateOrderIssues(event).map((issue) => ({
		code: "dates-out-of-order",
		subject: issue.field,
		severity: "blocking",
		what: issue.message,
		why: "Registration opens, closes, and takes payment on these dates, so out of order they let players in early or lock them out.",
		fix: "Correct the dates.",
		tab: issue.field === "startDate" ? "event" : "dates",
	}))
}

export function startTimeInvalid({ event }: EventSnapshot): Finding[] {
	if (!startTimeIssue(event)) return []
	return [
		{
			code: "start-time-invalid",
			subject: "",
			severity: "blocking",
			what: `The start time "${event.startTime ?? ""}" is not a time like 2:00 PM`,
			why: "Players choose tee times, which count from the start time; without one, the tee sheet has no times and registration emails fail.",
			fix: "Enter the first tee time, like 2:00 PM.",
			tab: "event",
		},
	]
}

export function eventCanceled({ event }: EventSnapshot): Finding[] {
	if (event.status !== EventStatusChoices.CANCELED) return []
	return [
		{
			code: "event-canceled",
			subject: "",
			severity: "blocking",
			what: "The event is canceled",
			why: "Players cannot register for a canceled event.",
			fix: "If the event is back on, set its status to Scheduled.",
			tab: "event",
		},
	]
}

export function noSlots({ event, slotCount }: EventSnapshot): Finding[] {
	if (!playersChooseSlots(event) || slotCount > 0) return []
	return [
		{
			code: "no-slots",
			subject: "",
			severity: "blocking",
			what: "Players choose their slots, but the event has none",
			why: "Players will have no tee times or starting holes to choose from.",
			fix: "Create the slots.",
			tab: "slots",
		},
	]
}

export function coursesMissing({ event, courseCount }: EventSnapshot): Finding[] {
	if (!playersChooseSlots(event) || courseCount > 0) return []
	return [
		{
			code: "courses-missing",
			subject: "",
			severity: "blocking",
			what: "The event has no courses",
			why: "Slots are created per course, and players choose a course when they register.",
			fix: "Choose the event's courses.",
			tab: "courses",
		},
	]
}

export function feesMissing({ event, fees }: EventSnapshot): Finding[] {
	if (event.registrationType === RegistrationTypeChoices.NONE || fees.length > 0) return []
	return [
		{
			code: "fees-missing",
			subject: "",
			severity: "blocking",
			what: "The event has no fees",
			why: "Registration charges the event's fees; with none, players register without paying.",
			fix: "Add the event fees.",
			tab: "fees",
		},
	]
}

export function sessionsMissing({ sessions, lastSeasonSessions }: EventSnapshot): Finding[] {
	if (!lastSeasonSessions?.length) return []
	if (sessions.length === 0) {
		return [
			{
				code: "sessions-missing",
				subject: "",
				severity: "warning",
				what: `Last season this event had sessions (${lastSeasonSessions.map((x) => x.name).join(", ")}), but it has none now`,
				why: "Players register for a session; without sessions the event opens with no session limits.",
				fix: "Add the sessions, or dismiss this warning if the change is deliberate.",
				tab: "sessions",
			},
		]
	}
	return lastSeasonSessions
		.filter((last) => last.overrideCount > 0)
		.filter((last) => sessions.find((x) => x.name === last.name)?.overrideCount === 0)
		.map((last) => ({
			code: "sessions-missing",
			subject: last.name,
			severity: "warning" as const,
			what: `The ${last.name} session has no fee overrides, but last season it had ${last.overrideCount}`,
			why: "Players in this session would be charged the event's regular fees.",
			fix: `Set the ${last.name} session's fee overrides, or dismiss this warning if the change is deliberate.`,
			tab: "sessions" as const,
		}))
}

/** "weeknight" for a Weeknight Event, "weekend major" for a Weekend Major. */
const kind = (e: ReadinessEvent) =>
	getEventTypeName(e.eventType)
		.replace(/ event$/i, "")
		.toLowerCase()

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]

const normalizeTime = (time: string | null) =>
	(time ?? "").trim().replace(/\s+/g, " ").toUpperCase()

const DAY_MS = 86_400_000

/** When a date falls relative to the event, in club time: "7|09:00" is 7 days before at 9 AM. */
function offset(startDate: string, iso: string | null): string | null {
	if (!iso) return null
	const { date, time } = clubWallClock(iso)
	const days = Math.round(
		(Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS,
	)
	return `${days}|${time}`
}

function describeOffset(key: string): string {
	const [days, time] = key.split("|")
	const [h, m] = time.split(":").map(Number)
	const when = formatTime(h * 60 + m)
	const n = Number(days)
	if (n === 0) return `the day of the event at ${when}`
	const count = Math.abs(n) === 1 ? "1 day" : `${Math.abs(n)} days`
	return `${count} ${n > 0 ? "before" : "after"} the event at ${when}`
}

/** The value most (more than half) of the values share, if there are enough to judge. */
function usual(values: string[]): string | null {
	if (values.length < MIN_PEERS) return null
	const counts = new Map<string, number>()
	for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
	for (const [value, n] of counts) if (n * 2 > values.length) return value
	return null
}

const SCHEDULE: {
	subject: string
	label: string
	value: (e: ReadinessEvent) => string | null
	describe: (v: string) => string
}[] = [
	{
		subject: "startTime",
		label: "Start time",
		value: (e) => normalizeTime(e.startTime) || null,
		describe: (v) => v,
	},
	{ subject: "weekday", label: "Weekday", value: (e) => weekday(e.startDate), describe: (v) => v },
	{
		subject: "prioritySignupStart",
		label: "Priority signup start",
		value: (e) => offset(e.startDate, e.prioritySignupStart),
		describe: describeOffset,
	},
	{
		subject: "signupStart",
		label: "Signup start",
		value: (e) => offset(e.startDate, e.signupStart),
		describe: describeOffset,
	},
	{
		subject: "signupEnd",
		label: "Signup end",
		value: (e) => offset(e.startDate, e.signupEnd),
		describe: describeOffset,
	},
	{
		subject: "paymentsEnd",
		label: "Payments end",
		value: (e) => offset(e.startDate, e.paymentsEnd),
		describe: describeOffset,
	},
]

export function scheduleDiffers({ event, peers }: EventSnapshot): Finding[] {
	const typeName = kind(event)
	const findings: Finding[] = []
	for (const item of SCHEDULE) {
		const mine = item.value(event)
		if (mine == null) continue
		const norm = usual(peers.map((p) => item.value(p.event)).filter((v): v is string => v != null))
		if (norm == null || norm === mine) continue
		findings.push({
			code: "schedule-differs",
			subject: item.subject,
			severity: "warning",
			what: `${item.label} is ${item.describe(mine)}; most ${typeName} events this season use ${item.describe(norm)}`,
			why: "Members expect events of the same kind to follow the same schedule, so a difference is usually a copy or typing mistake.",
			fix: "Correct it, or dismiss this warning if the difference is deliberate.",
			tab: item.subject === "startTime" || item.subject === "weekday" ? "event" : "dates",
		})
	}
	return findings
}

const money = (amount: number) => `$${amount.toFixed(2)}`

export function feeDiffers({ event, fees, peers }: EventSnapshot): Finding[] {
	const typeName = kind(event)
	return fees.flatMap((fee) => {
		const amounts = peers.flatMap((p) =>
			p.fees.filter((f) => f.feeTypeId === fee.feeTypeId).map((f) => f.amount.toFixed(2)),
		)
		const norm = usual(amounts)
		if (norm == null || norm === fee.amount.toFixed(2)) return []
		return [
			{
				code: "fee-differs",
				subject: String(fee.feeTypeId),
				severity: "warning" as const,
				what: `${fee.feeTypeName} is ${money(fee.amount)}; most ${typeName} events this season charge ${money(Number(norm))}`,
				why: "A fee that differs from similar events is usually left over from last season or mistyped.",
				fix: "Correct the fee, or dismiss this warning if the difference is deliberate.",
				tab: "fees" as const,
			},
		]
	})
}
