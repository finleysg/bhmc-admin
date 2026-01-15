import { addDays, isWithinInterval, parse } from "date-fns"
import { immerable } from "immer"
import { z } from "zod"

import { dayDateAndTimeFormat, isoDayFormat } from "../utils/date-utils"
import { EventType, RegistrationType, StartType, getEventTypeName } from "./codes"
import { Course, CourseApiSchema } from "./course"
import { EventFee, EventFeeApiSchema } from "./event-fee"
import { Player } from "./player"
import { RegistrationSlot } from "./registration"

export const slugify = (text: string) => {
	if (text) {
		return text
			.toString()
			.toLowerCase()
			.trim()
			.replace("/", " ")
			.replace(/\s+/g, "-")
			.replace(/[^\w-]+/g, "")
			.replace(/--+/g, "-")
	}
	return ""
}

export type RegistrationWindow = "future" | "registration" | "past" | "n/a"

export const ClubEventApiSchema = z.object({
	id: z.number(),
	age_restriction: z.number().nullish(),
	age_restriction_type: z.string(),
	can_choose: z.boolean(),
	courses: z.array(CourseApiSchema).optional(),
	default_tag: z.string().optional(),
	event_type: z.string(),
	external_url: z.string().nullish(),
	fees: z.array(EventFeeApiSchema).optional(),
	ghin_required: z.boolean(),
	group_size: z.number().nullish(),
	maximum_signup_group_size: z.number().nullish(),
	minimum_signup_group_size: z.number().nullish(),
	name: z.string(),
	notes: z.string().optional(),
	payments_end: z.coerce.date().nullish(),
	portal_url: z.string().nullish(),
	priority_signup_start: z.coerce.date().nullish(),
	registration_maximum: z.number().nullish(),
	registration_type: z.string(),
	registration_window: z.string(),
	rounds: z.number().nullish(),
	season: z.number(),
	season_points: z.number().nullish(),
	signup_start: z.coerce.date().nullish(),
	signup_end: z.coerce.date().nullish(),
	signup_waves: z.number().nullish(),
	skins_type: z.string().nullish(),
	start_date: z.string(),
	start_time: z.string().nullish(),
	start_type: z.string().nullish(),
	status: z.string(),
	team_size: z.number().nullish(),
	tee_time_splits: z.string().nullish(),
	total_groups: z.number().nullish(),
})

export type ClubEventData = z.infer<typeof ClubEventApiSchema>

export class ClubEvent {
	[immerable] = true

	id: number
	adminUrl: string
	ageRestriction?: number | null
	ageRestrictionType: string
	canChoose: boolean
	courses: Course[]
	defaultTag?: string
	endDate?: Date
	eventType: string
	eventTypeClass: string
	eventUrl: string
	externalUrl?: string | null
	fees: EventFee[]
	feeMap: Map<number, EventFee>
	ghinRequired: boolean
	groupSize?: number | null
	maximumSignupGroupSize?: number | null
	minimumSignupGroupSize?: number | null
	name: string
	notes?: string | undefined
	paymentsEnd?: Date | null
	portalUrl?: string | null
	prioritySignupStart?: Date | null
	registrationMaximum?: number | null
	registrationType: string
	registrationWindow: RegistrationWindow
	rounds: number
	season: number
	seasonPoints?: number | null
	signupStart?: Date | null
	signupEnd?: Date | null
	signupWindow: string
	signupWaves?: number | null
	skinsType?: string | null
	slugName: string
	slugDate: string
	startDate: Date
	startDateString: string
	startTime?: string | null
	startType?: string | null
	status: string
	teamSize: number
	teeTimeSplits?: string | null
	totalGroups?: number | null

	constructor(json: ClubEventData) {
		this.id = json.id
		this.ageRestriction = json.age_restriction
		this.ageRestrictionType = json.age_restriction_type
		this.canChoose = json.can_choose
		this.courses = json.courses?.map((c) => new Course(c)) ?? []
		this.defaultTag = json.default_tag
		this.eventType = json.event_type
		this.externalUrl = json.external_url
		this.fees =
			json.fees?.sort((a, b) => a.display_order - b.display_order).map((f) => new EventFee(f)) ?? []
		this.ghinRequired = json.ghin_required
		this.groupSize = json.group_size
		this.maximumSignupGroupSize = json.maximum_signup_group_size
		this.minimumSignupGroupSize = json.minimum_signup_group_size
		this.name = json.name
		this.notes = json.notes
		this.paymentsEnd = json.payments_end ?? json.signup_end
		this.portalUrl = json.portal_url
		this.prioritySignupStart = json.priority_signup_start
		this.registrationMaximum = json.registration_maximum
		this.registrationType = json.registration_type
		this.registrationWindow = json.registration_window
			? (json.registration_window as RegistrationWindow)
			: "n/a"
		this.rounds = json.rounds ?? 0
		this.season = json.season
		this.seasonPoints = json.season_points
		this.signupStart = json.signup_start
		this.signupEnd = json.signup_end
		this.signupWaves = json.signup_waves
		this.skinsType = json.skins_type
		this.startDate = parse(json.start_date, "yyyy-MM-dd", new Date())
		this.startDateString = json.start_date
		this.startTime = json.start_time
		this.startType = json.start_type
		this.status = json.status
		this.teamSize = json.team_size || 1
		this.teeTimeSplits = json.tee_time_splits || ""
		this.totalGroups = json.total_groups

		// derived properties
		this.adminUrl = `/admin/event/${this.id}`
		this.endDate = this.rounds <= 1 ? this.startDate : addDays(this.startDate, this.rounds - 1)
		this.eventTypeClass = getEventTypeName(json.event_type).toLowerCase().replace(" ", "-")
		this.eventUrl = `/event/${isoDayFormat(this.startDate)}/${slugify(json.name)}`
		this.feeMap = new Map(this.fees.map((f) => [f.id, f]))
		this.slugName = slugify(json.name)
		this.slugDate = isoDayFormat(this.startDate)
		this.signupWindow = `${dayDateAndTimeFormat(this.signupStart)} to ${dayDateAndTimeFormat(this.signupEnd)}`
	}

	/**
	 * Returns true if a payment end date is configured.
	 * @returns boolean
	 */
	canEditRegistration() {
		return (
			(this.eventType === EventType.Major || this.eventType === EventType.Weeknight) &&
			Boolean(this.paymentsEnd)
		)
	}

	/**
	 * Returns true if the current date and time is between signup start and payments end.
	 * @param {Date} now The current date and time
	 * @returns boolean
	 */
	paymentsAreOpen(now: Date = new Date()) {
		if (this.registrationType === RegistrationType.None || !this.signupStart || !this.paymentsEnd) {
			return false
		}
		return isWithinInterval(now, {
			start: this.prioritySignupStart ?? this.signupStart,
			end: this.paymentsEnd,
		})
	}

	/**
	 * Returns true if the given date and time is between signup start and signup end.
	 * @param {Date} now The current date and time
	 * @returns boolean
	 */
	registrationIsOpen(now: Date = new Date()) {
		if (this.registrationType === RegistrationType.None || !this.signupStart || !this.signupEnd) {
			return false
		}

		return isWithinInterval(now, {
			start: this.signupStart,
			end: this.signupEnd,
		})
	}

	/**
	 * Returns true if the current date and time is between priority signup start and signup start.
	 * @param {Date} now The current date and time
	 * @returns boolean
	 */
	priorityRegistrationIsOpen(now: Date = new Date()) {
		if (
			this.registrationType === RegistrationType.None ||
			!this.prioritySignupStart ||
			!this.signupStart ||
			!this.signupEnd
		) {
			return false
		}

		return isWithinInterval(now, {
			start: this.prioritySignupStart,
			end: this.signupStart,
		})
	}

	/**
	 * Returns true if the current date and time is between the start and end of the event.
	 * @param {Date} now The current date and time
	 * @param {Player} player The player to check for registration eligibility
	 * @returns boolean
	 * @memberof ClubEvent
	 */
	playerCanRegister(now: Date, player?: Player) {
		if (!player) {
			return false
		} else if (!this.priorityRegistrationIsOpen(now) && !this.registrationIsOpen(now)) {
			return false
		} else if (
			this.registrationType === RegistrationType.ReturningMembersOnly &&
			!player.isReturningMember
		) {
			return false
		} else if (this.registrationType === RegistrationType.MembersOnly && !player.isMember) {
			return false
		} else if (this.registrationType === RegistrationType.GuestsAllowed && !player.isMember) {
			return false
		} else if (this.ghinRequired && !player.ghin) {
			return false
		}
		return true
	}

	/**
	 * Returns true if the player is eligible to register for this event
	 * based on player age and event age restriction.
	 * @param {Player} player
	 * @returns boolean
	 */
	playerIsEligible(player?: Player) {
		if (!player) {
			return false
		} else if (!this.ageRestriction) {
			return true
		} else if (!player.birthDate) {
			return false
		} else {
			if (this.ageRestrictionType === "O") {
				return player.ageAtYearEnd! >= this.ageRestriction
			} else {
				return player.age! < this.ageRestriction
			}
		}
	}

	/**
	 * Returns true if this event starts in the given year and (0-based) month.
	 * @param {number} year
	 * @param {number} month
	 */
	isCurrent(year: number, month: number) {
		return this.startDate.getFullYear() === year && this.startDate.getMonth() === month
	}

	/**
	 * Returns the number of available spots, without
	 * regard to existing or ongoinng registrations.
	 */
	availableSpots() {
		if (this.registrationType === RegistrationType.None) {
			return null
		}
		// TODO: custom validation - the combo of canChoose (true) and groupSize (null) is invalid
		if (this.canChoose && this.groupSize) {
			if (this.startType === StartType.Shotgun) {
				const holes = this.courses[0]?.numberOfHoles
				return 2 * this.groupSize * (this.courses.length * holes)
			} else {
				if (!this.totalGroups) {
					throw "TotalGroups must have a non-zero value to calculate the available spots."
				}
				return this.groupSize * this.totalGroups * this.courses.length
			}
		} else {
			return this.registrationMaximum
		}
	}

	/**
	 * Given the current registration state (slots), how many openings are left?
	 * @param slots RegistrationSlot array for this event
	 * @returns Number of openings or -1 (unlimited)
	 */
	openSpots(slots: RegistrationSlot[]) {
		if (this.canChoose) {
			const filled = slots.filter((s) => s.status !== "A").length
			return slots.length - filled
		} else {
			const filled = slots.filter((s) => s.status === "R").length
			if (this.registrationMaximum) {
				return this.registrationMaximum - filled
			}
			return -1 // unlimited
		}
	}

	/**
	 * Given a file name, ensure the name will be valid and unique.
	 * @param filename The name of an event-related file (like tee times)
	 * @returns A normalized file name
	 */
	normalizeFilename(filename: string) {
		const name = filename
			.toLowerCase()
			.trim()
			.replace("/", " ")
			.replace(/\s+/g, "-")
			.replace(/--+/g, "-")
		return `${this.slugDate}-${this.slugName}-${name}`
	}

	/**
	 * Returns an array of Date objects representing when each wave unlocks during priority registration.
	 * @returns Array of wave unlock times, or empty array if wave registration is not configured
	 */
	getWaveUnlockTimes(): Date[] {
		if (
			!this.signupWaves ||
			this.signupWaves <= 0 ||
			!this.prioritySignupStart ||
			!this.signupStart
		) {
			return []
		}

		const unlockTimes: Date[] = []
		const priorityStart = this.prioritySignupStart
		const priorityDuration = this.signupStart.getTime() - priorityStart.getTime()
		const waveDuration = priorityDuration / this.signupWaves

		for (let i = 0; i < this.signupWaves; i++) {
			unlockTimes.push(new Date(priorityStart.getTime() + i * waveDuration))
		}

		return unlockTimes
	}

	/**
	 * Returns the current active wave number during priority registration.
	 * @param now The current date and time
	 * @returns Current wave number (1-based), or 0 if wave registration is not active
	 */
	getCurrentWave(now: Date = new Date()): number {
		if (!this.signupWaves || this.signupWaves <= 0) {
			return 0 // No wave restrictions
		}

		const isPriorityPeriod = this.priorityRegistrationIsOpen(now)
		if (!isPriorityPeriod) {
			return 0 // Outside priority period, no restrictions
		}

		// Calculate wave duration in milliseconds
		const priorityStart = this.prioritySignupStart!
		const signupStart = this.signupStart!
		const priorityDuration = signupStart.getTime() - priorityStart.getTime()
		const waveDuration = priorityDuration / this.signupWaves

		// Calculate elapsed time since priority start
		const elapsedTime = now.getTime() - priorityStart.getTime()

		// Determine current wave (1-based)
		const currentWaveNumber = Math.floor(elapsedTime / waveDuration) + 1

		// Ensure we don't exceed the total waves
		return Math.min(currentWaveNumber, this.signupWaves)
	}

	static getClubEvent(events?: ClubEvent[], eventDate?: string, eventName?: string) {
		if (events && eventDate && eventName) {
			const event = events.find((e) => e.slugDate === eventDate && e.slugName === eventName)
			if (!event) {
				return { found: false, clubEvent: null }
			}
			return { found: true, clubEvent: event }
		}
		return { found: false, clubEvent: null }
	}
}

export const SimpleEventApiSchema = z.object({
	id: z.number(),
	event_type: z.string(),
	name: z.string(),
	season: z.number(),
	start_date: z.string(),
})

export type SimpleEventData = z.infer<typeof SimpleEventApiSchema>

export class SimpleEvent {
	[immerable] = true

	id: number
	eventType: string
	eventUrl: string
	name: string
	season: number
	startDate: Date
	startDateString: string

	constructor(json: SimpleEventData) {
		this.id = json.id
		this.eventType = json.event_type
		this.name = json.name
		this.season = json.season
		this.startDate = parse(json.start_date, "yyyy-MM-dd", new Date())
		this.startDateString = json.start_date
		this.eventUrl = `/event/${isoDayFormat(this.startDate)}/${slugify(json.name)}`
	}
}
