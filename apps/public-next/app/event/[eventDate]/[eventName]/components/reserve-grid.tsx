"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useRegistration } from "@/lib/registration/registration-context"
import { RegistrationStatus } from "@/lib/registration/types"
import {
	getAvailabilityMessage,
	getMinimumSelectedSlots,
	type ReserveGroup,
	type ReserveSlot,
	type ReserveTable,
	updateSlotSelection,
} from "@/lib/registration/reserve-utils"
import type { Course } from "@/lib/types"
import { SlotCell } from "./slot-cell"
import { TeeSheetTabs } from "./tee-sheet-tabs"

interface ReserveGridProps {
	tables: ReserveTable[]
	mode: "view" | "edit"
	onReserve: (course: Course, slots: ReserveSlot[]) => void
	waveUnlockTimes?: Date[]
	registrationStartTime?: Date | null
}

export function ReserveGrid({
	tables,
	mode,
	onReserve,
	waveUnlockTimes,
	registrationStartTime,
}: ReserveGridProps) {
	const { sseConnected, sseCurrentWave, error, setError, clubEvent } = useRegistration()
	const [selectedSlots, setSelectedSlots] = useState<ReserveSlot[]>([])

	// Clear selection on error
	if (error) {
		toast.error(error)
		setError(null)
		if (selectedSlots.length > 0) {
			selectedSlots.forEach((s) => {
				s.selected = false
			})
			setSelectedSlots([])
		}
	}

	const handleSelect = useCallback(
		(slots: ReserveSlot[]) => {
			if (mode === "view") return
			setSelectedSlots(updateSlotSelection(selectedSlots, slots))
		},
		[mode, selectedSlots],
	)

	const handleReserve = useCallback(
		(table: ReserveTable) => {
			if (selectedSlots.length > 0) {
				onReserve(table.course, selectedSlots)
			}
		},
		[selectedSlots, onReserve],
	)

	if (tables.length === 0) return null

	const minRequired = clubEvent ? getMinimumSelectedSlots(clubEvent) : 1

	const renderGroupActions = (group: ReserveGroup, table: ReserveTable) => {
		const waveAvailable = sseCurrentWave !== null && sseCurrentWave >= group.wave
		const hasOpenings = group.slots.some((s) => s.status === RegistrationStatus.Available)
		const selectedCount = group.slots.filter((s) => s.selected).length
		const hasEnoughSlots = selectedCount >= minRequired
		return (
			<>
				{mode === "edit" && (
					<div className="flex shrink-0 gap-2">
						<Button
							variant="default"
							size="xs"
							disabled={!hasOpenings || !waveAvailable}
							onClick={() => {
								const available = group.slots.filter(
									(s) => s.status === RegistrationStatus.Available,
								)
								handleSelect(available)
							}}
						>
							Select
						</Button>
						<Button
							variant="secondary"
							size="xs"
							disabled={!hasEnoughSlots || !waveAvailable}
							onClick={() => handleReserve(table)}
						>
							Register
						</Button>
					</div>
				)}
			</>
		)
	}

	const groupClassName = (group: ReserveGroup) => {
		const waveAvailable = sseCurrentWave !== null && sseCurrentWave >= group.wave
		return !waveAvailable ? "opacity-50" : ""
	}

	return (
		<>
			{!sseConnected && sseCurrentWave !== null && (
				<div className="mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
					<WifiOff className="h-4 w-4 shrink-0" />
					Live updates unavailable — refreshing automatically
				</div>
			)}
			<TeeSheetTabs
			tables={tables}
			className="mt-4"
			renderSlot={(slot, table) => {
				const group = table.groups.find((g) => g.id === slot.groupId)
				const wave = group?.wave ?? 0
				const waveAvailable = sseCurrentWave !== null && sseCurrentWave >= wave
				const canSelect = waveAvailable && mode === "edit"
				const label =
					!waveAvailable && group
						? getAvailabilityMessage(
								group,
								false,
								sseCurrentWave,
								waveUnlockTimes,
								registrationStartTime,
							)
						: undefined
				return (
					<SlotCell
						key={slot.id}
						slot={slot}
						courseColor={table.course.color ?? undefined}
						selected={slot.selected}
						onSelect={canSelect ? (s) => handleSelect([s]) : undefined}
						label={label}
					/>
				)
			}}
			renderGroupActions={renderGroupActions}
			groupClassName={groupClassName}
		/>
		</>
	)
}
