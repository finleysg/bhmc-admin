import { addMinutes, format, parse } from "date-fns"

import type {
	ClubEventDetail,
	Course,
	Hole,
	RegistrationSlot,
	RegistrationSlotPlayer,
} from "../types"
import { RegistrationStatus, StartType } from "./types"
import type { SSESlotData } from "./types"

const DEFAULT_SPLIT = 8

// --- Reserve interfaces ---

export interface ReserveSlot {
	id: number
	groupId: string
	holeId: number | null
	playerId: number | null
	playerName: string | undefined
	position: number
	registrationId: number | null
	startingOrder: number
	status: string
	statusName: string
	selected: boolean
}

export interface ReserveGroup {
	id: string
	courseId: number
	holeId: number
	holeNumber: number
	slots: ReserveSlot[]
	startingOrder: number
	name: string
	wave: number
}

export interface ReserveTable {
	course: Course
	groups: ReserveGroup[]
}

// --- Public functions ---

export function loadReserveTables(
	event: ClubEventDetail,
	slots: RegistrationSlot[],
): ReserveTable[] {
	if (slots.length === 0) return []

	if (event.start_type === StartType.TeeTimes) {
		return createTeeTimes(event, slots)
	} else if (event.start_type === StartType.Shotgun) {
		return createShotgun(event, slots)
	}

	throw new Error(
		`${event.start_type} is an invalid start type for an event where players can choose their tee time or starting hole.`,
	)
}

export function getGroupStartName(
	event: ClubEventDetail,
	startingHole: number,
	startingOrder: number,
): string {
	if (event.start_type === StartType.Shotgun) {
		return `${startingHole}${startingOrder === 0 ? "A" : "B"}`
	}
	const startingTime = parse(event.start_time!, "h:mm a", new Date(event.start_date))
	return calculateTeetime(startingTime, startingOrder, getTeeTimeSplits(event))
}

export function getTeeTimeSplits(event: ClubEventDetail): number[] {
	if (!event.tee_time_splits) return [DEFAULT_SPLIT]
	return event.tee_time_splits.split(",").map((s) => parseInt(s, 10))
}

export function calculateTeetime(
	startingTime: Date,
	startingOrder: number,
	intervals: number[],
): string {
	const offset =
		intervals.length === 1 ? startingOrder * intervals[0] : getOffset(startingOrder, intervals)
	return format(addMinutes(startingTime, offset), "h:mm a")
}

export function calculateWave(
	groupIndex: number,
	totalGroups: number,
	signupWaves?: number | null,
): number {
	if (!signupWaves || signupWaves <= 0) return 0
	const base = Math.floor(totalGroups / signupWaves)
	const remainder = totalGroups % signupWaves
	const cutoff = remainder * (base + 1)
	if (groupIndex < cutoff) {
		return Math.floor(groupIndex / (base + 1)) + 1
	}
	return remainder + Math.floor((groupIndex - cutoff) / base) + 1
}

/**
 * Returns an array of Date objects representing when each wave unlocks during priority registration.
 * Empty array if wave registration is not configured.
 */
export function getWaveUnlockTimes(event: ClubEventDetail): Date[] {
	if (
		!event.signup_waves ||
		event.signup_waves <= 0 ||
		!event.priority_signup_start ||
		!event.signup_start
	) {
		return []
	}

	const priorityStart = new Date(event.priority_signup_start)
	const signupStart = new Date(event.signup_start)
	const priorityDuration = signupStart.getTime() - priorityStart.getTime()
	const waveDuration = priorityDuration / event.signup_waves

	const unlockTimes: Date[] = []
	for (let i = 0; i < event.signup_waves; i++) {
		unlockTimes.push(new Date(priorityStart.getTime() + i * waveDuration))
	}
	return unlockTimes
}

/**
 * Transform SSE slot data (NestJS camelCase) to Django snake_case format
 * for direct React Query cache updates.
 */
export function transformSSESlots(sseSlots: SSESlotData[]): RegistrationSlot[] {
	return sseSlots.map((slot) => ({
		id: slot.id,
		event: slot.eventId,
		registration: slot.registrationId ?? null,
		hole: slot.holeId ?? null,
		starting_order: slot.startingOrder,
		slot: slot.slot,
		status: slot.status,
		player: slot.player ? transformPlayer(slot.player) : null,
	}))
}

function transformPlayer(player: NonNullable<SSESlotData["player"]>): RegistrationSlotPlayer {
	return {
		id: player.id,
		first_name: player.firstName,
		last_name: player.lastName,
		email: player.email ?? null,
		phone_number: player.phoneNumber ?? null,
		ghin: player.ghin ?? null,
		tee: player.tee ?? null,
		birth_date: player.birthDate ?? null,
		is_member: typeof player.isMember === "number" ? player.isMember === 1 : player.isMember,
		last_season: player.lastSeason ?? null,
	}
}

/**
 * Returns a human-readable message like "Opens at 6:15 PM" for wave-locked groups.
 * Returns undefined if the group is already available.
 */
export function getAvailabilityMessage(
	group: ReserveGroup,
	waveAvailable: boolean,
	currentWave: number | null,
	waveUnlockTimes?: Date[],
	registrationStartTime?: Date | null,
): string | undefined {
	if (waveAvailable) return undefined
	if (waveUnlockTimes && group.wave > 0 && group.wave <= waveUnlockTimes.length) {
		const unlockTime = waveUnlockTimes[group.wave - 1]
		return `Opens at ${format(unlockTime, "h:mm a")}`
	}
	if (registrationStartTime) {
		return `Opens at ${format(registrationStartTime, "h:mm a")}`
	}
	return undefined
}

// --- Helpers ---

function getStatusName(statusCode: string): string {
	switch (statusCode) {
		case RegistrationStatus.Available:
			return "Open"
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

function createReserveSlot(groupId: string, slot: RegistrationSlot): ReserveSlot {
	return {
		id: slot.id,
		groupId,
		holeId: slot.hole,
		playerId: slot.player?.id ?? null,
		playerName: slot.player ? `${slot.player.first_name} ${slot.player.last_name}` : undefined,
		position: slot.slot,
		registrationId: slot.registration,
		startingOrder: slot.starting_order,
		status: slot.status,
		statusName: getStatusName(slot.status),
		selected: false,
	}
}

function createReserveGroup(
	course: Course,
	hole: Hole,
	slots: RegistrationSlot[],
	name: string,
	wave: number,
): ReserveGroup {
	const id = `${course.name.toLowerCase()}-${name.toLowerCase()}`
	const reserveSlots = slots.map((slot) => createReserveSlot(id, slot))
	return {
		id,
		courseId: course.id,
		holeId: hole.id,
		holeNumber: hole.hole_number,
		slots: reserveSlots,
		startingOrder: reserveSlots[0]?.startingOrder ?? 0,
		name,
		wave,
	}
}

function createTeeTimes(event: ClubEventDetail, slots: RegistrationSlot[]): ReserveTable[] {
	const startingTime = parse(event.start_time!, "h:mm a", new Date(event.start_date))
	const teeTimeSplits = getTeeTimeSplits(event)

	return event.courses.map((course) => {
		const firstHole = course.holes[0]
		const groups: ReserveGroup[] = []
		for (let i = 0; i < event.total_groups!; i++) {
			const group = slots.filter((slot) => slot.starting_order === i && slot.hole === firstHole.id)
			const teetime = calculateTeetime(startingTime, i, teeTimeSplits)
			const wave = calculateWave(i, event.total_groups!, event.signup_waves)
			groups.push(createReserveGroup(course, firstHole, group, teetime, wave))
		}
		return { course, groups }
	})
}

function createShotgun(event: ClubEventDetail, slots: RegistrationSlot[]): ReserveTable[] {
	return event.courses.map((course) => {
		const groups: ReserveGroup[] = []
		let groupIndex = 0
		const totalGroups = course.holes.length * 2
		course.holes.forEach((hole) => {
			const aGroup = slots.filter((slot) => slot.hole === hole.id && slot.starting_order === 0)
			const bGroup = slots.filter((slot) => slot.hole === hole.id && slot.starting_order === 1)
			groups.push(
				createReserveGroup(
					course,
					hole,
					aGroup,
					`${hole.hole_number}A`,
					calculateWave(groupIndex++, totalGroups, event.signup_waves),
				),
			)
			groups.push(
				createReserveGroup(
					course,
					hole,
					bGroup,
					`${hole.hole_number}B`,
					calculateWave(groupIndex++, totalGroups, event.signup_waves),
				),
			)
		})
		return { course, groups }
	})
}

function getOffset(startingOrder: number, intervals: number[]): number {
	if (startingOrder === 0) return 0
	if (startingOrder % 2 === 0) {
		return (startingOrder / 2) * (intervals[0] + intervals[1])
	}
	return Math.floor(startingOrder / 2) * (intervals[0] + intervals[1]) + intervals[0]
}
