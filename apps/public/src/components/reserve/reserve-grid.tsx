import React, { ComponentPropsWithoutRef, useEffect } from "react"

import { toast } from "react-toastify"

import { useEventRegistration } from "../../hooks/use-event-registration"
import { Course } from "../../models/course"
import { ReserveSlot, ReserveTable } from "../../models/reserve"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { ReserveRow } from "./reserve-row"
import { ClubEvent } from "../../models/club-event"

interface ReserveGridProps extends ComponentPropsWithoutRef<"div"> {
	table: ReserveTable
	clubEvent: ClubEvent
	mode: "view" | "edit"
	wave: number
	onReserve: (course: Course, groupName: string, slots: ReserveSlot[]) => void
}

export function ReserveGrid({
	table,
	clubEvent,
	mode,
	wave,
	onReserve,
	...rest
}: ReserveGridProps) {
	const [selectedSlots, updateSelectedSlots] = React.useState<ReserveSlot[]>([])
	const { error, setError } = useEventRegistration()

	useEffect(() => {
		if (error) {
			updateSelectedSlots([])
			toast.error(error.message, { autoClose: 3000 })
			setError(null)
		}
	}, [error, setError])

	const handleSingleSelect = (slot: ReserveSlot) => {
		if (mode === "view") {
			return
		}
		const currentlySelected = selectedSlots.filter((ss) => ss.groupId === slot.groupId).slice(0)
		updateSelectedSlots(currentlySelected) // clears previous selections in other groups
		slot.selected = !slot.selected
		if (slot.selected) {
			currentlySelected.push(slot)
		} else {
			const index = currentlySelected.findIndex((s) => s.id === slot.id)
			currentlySelected.splice(index, 1)
		}
		updateSelectedSlots(currentlySelected)
	}

	const handleSelect = (slots: ReserveSlot[]) => {
		if (mode === "view") {
			return
		}
		if (slots.length === 1) {
			handleSingleSelect(slots[0])
		} else {
			const currentlySelected = [] as ReserveSlot[]
			updateSelectedSlots(currentlySelected) // clears previous selections
			slots.forEach((slot) => {
				if (slot.canSelect()) {
					slot.selected = true
					currentlySelected.push(slot)
				}
			})
			updateSelectedSlots(currentlySelected)
		}
	}

	const handleReserve = (groupName: string) => {
		if (selectedSlots?.length > 0) {
			onReserve(table.course, groupName, selectedSlots)
		}
	}

	// ensure the selected-slot state is applied
	if (table) {
		table.applySelectedSlots(selectedSlots)
	}

	const waveUnlockTimes = clubEvent.getWaveUnlockTimes()

	return (
		<div className="card mt-4" {...rest}>
			<div className="card-body">
				<OverlaySpinner loading={!table} />
				{Boolean(table) &&
					table.groups.map((group) => (
						<ReserveRow
							key={group.name}
							mode={mode}
							courseName={table.course.name}
							group={group}
							wave={wave}
							waveUnlockTimes={waveUnlockTimes}
							onSelect={handleSelect}
							onReserve={handleReserve}
						/>
					))}
			</div>
		</div>
	)
}
