import { addMinutes, format, parse } from "date-fns"

import type { ClubEventDetail, Course, Hole, RegistrationSlot } from "../types"
import { RegistrationStatus, StartType } from "./types"

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
		intervals.length === 1
			? startingOrder * intervals[0]
			: getOffset(startingOrder, intervals)
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

// --- Helpers ---

function getStatusName(statusCode: string): string {
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

function createReserveSlot(groupId: string, slot: RegistrationSlot): ReserveSlot {
	return {
		id: slot.id,
		groupId,
		holeId: slot.hole,
		playerId: null,
		playerName: undefined,
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
			const group = slots.filter(
				(slot) => slot.starting_order === i && slot.hole === firstHole.id,
			)
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
			const aGroup = slots.filter(
				(slot) => slot.hole === hole.id && slot.starting_order === 0,
			)
			const bGroup = slots.filter(
				(slot) => slot.hole === hole.id && slot.starting_order === 1,
			)
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
