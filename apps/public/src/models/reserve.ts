import { addMinutes, format, parse } from "date-fns"

import { ClubEvent } from "./club-event"
import { getStatusName, RegistrationStatus, StartType } from "./codes"
import { Course, Hole } from "./course"
import { Refund } from "./refund"
import { Registration, RegistrationSlot } from "./registration"

const DEFAULT_SPLIT = 8

/**
 * A reservation is a combination of a registration, a slot, and
 * the player's name.  It is used to display a list of reserved
 * spots in an event.
 */
export interface Reservation {
	registrationId: number
	slotId: number
	playerId: number
	name: string
	sortName: string
	signedUpBy: string
	signupDate: Date
}

export class ReserveSlot {
	id: number
	groupId: string
	holeId: number | null
	playerId: number | null
	playerName?: string
	position: number
	registrationId: number | null
	startingOrder: number
	status: string
	statusName: string
	selected: boolean
	fees: Refund[]
	obj: RegistrationSlot

	constructor(groupId: string, slot: RegistrationSlot) {
		this.obj = slot
		this.id = slot.id
		this.groupId = groupId
		this.holeId = slot.holeId
		this.playerId = slot.playerId
		this.playerName = slot.playerName
		this.position = slot.slot // 0 to size of group - 1
		this.registrationId = slot.registrationId
		this.startingOrder = slot.startingOrder
		this.status = slot.status
		this.statusName = getStatusName(slot.status)
		this.selected = false
		this.fees = []
	}

	isRegistered = (playerId: number) => {
		return this.playerId === playerId
	}

	displayText = () => {
		if (this.selected && this.status === RegistrationStatus.Available) {
			return "Selected"
		} else if (this.status === RegistrationStatus.Reserved) {
			return this.playerName
		} else if (this.status === RegistrationStatus.Processing) {
			return this.playerName
		} else {
			return this.statusName
		}
	}

	deriveClass = () => {
		const className = "reserve-slot"
		if (this.selected) {
			return className + " reserve-slot__selected"
		}
		return className + ` reserve-slot__${this.statusName.replace(" ", "-").toLowerCase()}`
	}

	canSelect = () => {
		return this.status === RegistrationStatus.Available
	}

	toRegistrationSlot = () => {
		return this.obj
	}
}

export class ReserveGroup {
	id: string
	courseId: number
	holeId: number
	holeNumber: number
	slots: ReserveSlot[]
	startingOrder: number
	name: string
	wave: number

	constructor(course: Course, hole: Hole, slots: RegistrationSlot[], name: string, wave: number) {
		this.id = `${course.name.toLowerCase()}-${name.toLowerCase()}`
		this.courseId = course.id
		this.holeId = hole.id
		this.holeNumber = hole.holeNumber
		this.slots = slots.map((slot) => new ReserveSlot(this.id, slot))
		this.startingOrder = this.slots[0]?.startingOrder
		this.name = name // starting hole or tee time
		this.wave = wave // ?? deriveWave(name)
	}

	isRegistered = (playerId: number) => {
		return this.slots.some((slot) => {
			return slot.isRegistered(playerId)
		})
	}

	hasOpenings = () => {
		return this.slots.some((s) => {
			return s.status === RegistrationStatus.Available
		})
	}

	isDisabled = () => {
		return !this.slots.some((s) => {
			return s.selected
		})
	}

	selectedSlotIds = () => {
		return this.slots.filter((s) => s.selected).map((s) => s.id)
	}
}

export class ReserveTable {
	course: Course
	groups: ReserveGroup[]

	constructor(course: Course) {
		this.course = course
		this.groups = []
	}

	/**
	 * Clear any selections in a different row
	 * @param {string} groupName - The only group that should have selections
	 */
	clearOtherGroups = (groupName: string) => {
		this.groups.forEach((group) => {
			group.slots.forEach((slot) => {
				if (group.name !== groupName) {
					slot.selected = false
				}
			})
		})
	}

	/**
	 * Apply any selections to this table
	 * @param {Array} selectedSlots - An array of selected slot
	 */
	applySelectedSlots = (selectedSlots: ReserveSlot[]) => {
		this.groups.forEach((group) => {
			group.slots.forEach((slot) => {
				slot.selected = false
				if (selectedSlots.findIndex((s) => s.id === slot.id) >= 0) {
					slot.selected = true
				}
			})
		})
	}

	/**
	 * Return slots that are part of a given registation
	 * @param {number} registrationId - The registration
	 */
	findSlotsByRegistrationId = (registrationId: number) => {
		const slots: ReserveSlot[] = []
		this.groups.forEach((group) => {
			group.slots.forEach((slot) => {
				if (slot.registrationId === registrationId && Boolean(slot.playerId)) {
					slots.push(slot)
				}
			})
		})
		return slots
	}
}

export const LoadReserveTables = (clubEvent: ClubEvent, slots: RegistrationSlot[]) => {
	if (Boolean(slots) && slots.length > 0) {
		if (clubEvent.startType === StartType.TeeTimes) {
			return createTeeTimes(clubEvent, slots)
		} else if (clubEvent.startType === StartType.Shotgun) {
			return createShotgun(clubEvent, slots)
		} else {
			throw new Error(
				`${clubEvent.startType} is an invalid start type for an event where 
        players can choose their tee time or starting hole.`,
			)
		}
	}
	return []
}

export const GetGroupStartName = (
	clubEvent: ClubEvent,
	startingHole: number,
	startingOrder: number,
) => {
	if (clubEvent.startType === "Shotgun") {
		return calculateStartingHole(startingHole, startingOrder)
	} else {
		const startingTime = parse(clubEvent.startTime!, "h:mm a", clubEvent.startDate)
		return calculateTeetime(startingTime, startingOrder, getTeeTimeSplits(clubEvent))
	}
}

/**
 * Create refund objects out of the given reserve slots and fee information.
 * The fee collection includes 0 - many selected fees/payments.
 * @param {ReserveSlot[]} slots - reserve slots with fee collections
 */
export const CreateRefunds = (slots: ReserveSlot[], notes: string) => {
	const feeDetails = slots.flatMap((slot) => slot.fees)
	return feeDetails
		.filter((fee) => fee.selected)
		.reduce((acc, curr) => {
			const refund = acc.get(curr.payment.id)
			if (refund) {
				refund.refund_amount += curr.eventFee.amount
			} else {
				acc.set(curr.payment.id, {
					payment: curr.payment.id,
					refund_amount: curr.eventFee.amount,
					notes,
				})
			}
			return acc
		}, new Map())
}

// each table is a hierarchy: course --> groups --> slots
const createTeeTimes = (clubEvent: ClubEvent, slots: RegistrationSlot[]) => {
	const tables: ReserveTable[] = []
	const startingTime = parse(clubEvent.startTime!, "h:mm a", clubEvent.startDate)
	const teeTimeSplits = getTeeTimeSplits(clubEvent)

	clubEvent.courses.forEach((course) => {
		const table = new ReserveTable(course)
		const firstHole = course.holes[0]
		for (let i = 0; i < clubEvent.totalGroups!; i++) {
			const group = slots.filter((slot) => {
				return slot.startingOrder === i && slot.holeId === firstHole.id
			})
			const teetime = calculateTeetime(startingTime, i, teeTimeSplits)
			const wave = calculateWave(i, clubEvent.totalGroups!, clubEvent.signupWaves)
			table.groups.push(new ReserveGroup(course, firstHole, group, teetime, wave))
		}
		tables.push(table)
	})

	return tables
}

const createShotgun = (clubEvent: ClubEvent, slots: RegistrationSlot[]) => {
	const tables: ReserveTable[] = []

	clubEvent.courses.forEach((course) => {
		const table = new ReserveTable(course)
		let groupIndex = 0
		course.holes.forEach((hole) => {
			const aGroup = slots.filter((slot) => {
				return slot.holeId === hole.id && slot.startingOrder === 0
			})
			const bGroup = slots.filter((slot) => {
				return slot.holeId === hole.id && slot.startingOrder === 1
			})
			const totalGroups = course.holes.length * 2 // A and B groups per hole
			table.groups.push(
				new ReserveGroup(
					course,
					hole,
					aGroup,
					`${hole.holeNumber}A`,
					calculateWave(groupIndex++, totalGroups, clubEvent.signupWaves),
				),
			)
			table.groups.push(
				new ReserveGroup(
					course,
					hole,
					bGroup,
					`${hole.holeNumber}B`,
					calculateWave(groupIndex++, totalGroups, clubEvent.signupWaves),
				),
			)
		})
		tables.push(table)
	})

	return tables
}

// Supports null or empty (""), single numeric value ("9"), or alternating
// numeric values separated by a comma ("8,9")
const calculateTeetime = (startingTime: Date, startingOrder: number, intervals: number[]) => {
	const offset =
		intervals.length === 1 ? startingOrder * intervals[0] : getOffset(startingOrder, intervals)
	return format(addMinutes(startingTime, offset), "h:mm a")
}

const calculateStartingHole = (holeNumber: number, startingOrder: number) => {
	return `${holeNumber}${startingOrder === 0 ? "A" : "B"}`
}

const getTeeTimeSplits = (clubEvent: ClubEvent) => {
	if (!clubEvent.teeTimeSplits) {
		return [DEFAULT_SPLIT]
	}
	const splits = clubEvent.teeTimeSplits.split(",")
	return splits.map((s) => {
		return parseInt(s, 10)
	})
}

const getOffset = (startingOrder: number, intervals: number[]) => {
	if (startingOrder === 0) {
		return 0
	} else if (startingOrder % 2 === 0) {
		return (startingOrder / 2) * (intervals[0] + intervals[1])
	} else {
		return Math.floor(startingOrder / 2) * (intervals[0] + intervals[1]) + intervals[0]
	}
}

export const ConvertRegistrationsToReservations = (registrations: Registration[]) => {
	const reservations = [] as Reservation[]
	registrations?.forEach((r) => {
		r.slots
			.filter((r) => r.status === RegistrationStatus.Reserved)
			.forEach((s) => {
				reservations.push({
					registrationId: r.id,
					slotId: s.id,
					playerId: s.playerId ?? 0,
					name: s.playerName ?? "",
					sortName: s.sortName ?? "",
					signedUpBy: r.signedUpBy,
					signupDate: r.createdDate,
				})
			})
	})
	return reservations
}

export const calculateWave = (
	groupIndex: number,
	totalGroups: number,
	signupWaves?: number | null,
) => {
	if (!signupWaves || signupWaves <= 0) {
		return 0 // No wave restrictions
	}
	const base = Math.floor(totalGroups / signupWaves)
	const remainder = totalGroups % signupWaves
	const cutoff = remainder * (base + 1)
	if (groupIndex < cutoff) {
		return Math.floor(groupIndex / (base + 1)) + 1
	} else {
		return remainder + Math.floor((groupIndex - cutoff) / base) + 1
	}
}
