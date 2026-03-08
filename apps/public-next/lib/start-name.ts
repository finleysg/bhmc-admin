import { addMinutes, format, parse } from "date-fns"

import type { ClubEventDetail } from "./types"

const DEFAULT_SPLIT = 8

function getTeeTimeSplits(event: ClubEventDetail): number[] {
	if (!event.tee_time_splits) {
		return [DEFAULT_SPLIT]
	}
	return event.tee_time_splits.split(",").map((s) => parseInt(s, 10))
}

function getOffset(startingOrder: number, intervals: number[]): number {
	if (startingOrder === 0) {
		return 0
	} else if (startingOrder % 2 === 0) {
		return (startingOrder / 2) * (intervals[0] + intervals[1])
	} else {
		return Math.floor(startingOrder / 2) * (intervals[0] + intervals[1]) + intervals[0]
	}
}

function calculateTeetime(startingTime: Date, startingOrder: number, intervals: number[]): string {
	const offset =
		intervals.length === 1 ? startingOrder * intervals[0] : getOffset(startingOrder, intervals)
	return format(addMinutes(startingTime, offset), "h:mm a")
}

function calculateStartingHole(holeNumber: number, startingOrder: number): string {
	return `${holeNumber}${startingOrder === 0 ? "A" : "B"}`
}

export function getGroupStartName(
	event: ClubEventDetail,
	startingHoleNumber: number,
	startingOrder: number,
): string {
	if (event.start_type === "SG") {
		return calculateStartingHole(startingHoleNumber, startingOrder)
	} else {
		const startingTime = parse(event.start_time!, "h:mm a", new Date(event.start_date))
		const splits = getTeeTimeSplits(event)
		return calculateTeetime(startingTime, startingOrder, splits)
	}
}
