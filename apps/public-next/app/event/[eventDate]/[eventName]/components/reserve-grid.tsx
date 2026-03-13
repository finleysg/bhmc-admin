"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
	const [waveImminent, setWaveImminent] = useState(false)

	// Derive selected IDs from state so selection survives table recreation (SSE updates)
	const selectedIds = useMemo(() => new Set(selectedSlots.map((s) => s.id)), [selectedSlots])

	// Reconcile selectedSlots when tables change (e.g. SSE delivers new slot objects).
	// Drop any slots that are no longer available (taken by another user).
	useEffect(() => {
		if (selectedSlots.length === 0) return
		const currentSlotMap = new Map<number, ReserveSlot>()
		for (const t of tables) {
			for (const g of t.groups) {
				for (const s of g.slots) {
					currentSlotMap.set(s.id, s)
				}
			}
		}
		const valid = selectedSlots.filter((s) => {
			const current = currentSlotMap.get(s.id)
			return current && current.status === RegistrationStatus.Available
		})
		if (valid.length !== selectedSlots.length) {
			selectedSlots.forEach((s) => {
				s.selected = false
			})
			const reconciled: ReserveSlot[] = []
			for (const old of valid) {
				const current = currentSlotMap.get(old.id)!
				current.selected = true
				reconciled.push(current)
			}
			setSelectedSlots(reconciled)
		}
	}, [tables]) // selectedSlots intentionally excluded — we read but conditionally update it

	// Pulse "Opens at" labels 15 seconds before the next wave unlocks
	useEffect(() => {
		if (!waveUnlockTimes?.length || sseCurrentWave === null) {
			setWaveImminent(false)
			return
		}

		const nextWaveIndex = sseCurrentWave // unlock times are 0-indexed, waves are 1-indexed
		if (nextWaveIndex >= waveUnlockTimes.length) {
			setWaveImminent(false)
			return
		}

		const LEAD_TIME = 15_000
		const scheduleCheck = () => {
			const msUntilUnlock = waveUnlockTimes[nextWaveIndex].getTime() - Date.now()
			if (msUntilUnlock <= 0) {
				setWaveImminent(false)
				return undefined
			}
			if (msUntilUnlock <= LEAD_TIME) {
				setWaveImminent(true)
				return undefined
			}
			setWaveImminent(false)
			return setTimeout(() => setWaveImminent(true), msUntilUnlock - LEAD_TIME)
		}

		const timerId = scheduleCheck()
		return () => {
			if (timerId) clearTimeout(timerId)
		}
	}, [waveUnlockTimes, sseCurrentWave])

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
		const selectedCount = group.slots.filter((s) => selectedIds.has(s.id)).length
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
				<div className="text-sm text-muted-foreground">
					<WifiOff className="h-4 w-4 shrink-0" />
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
					const nextWave = sseCurrentWave !== null ? sseCurrentWave + 1 : null
					const pulse = waveImminent && nextWave !== null && wave === nextWave
					return (
						<SlotCell
							key={slot.id}
							slot={slot}
							courseColor={table.course.color ?? undefined}
							selected={selectedIds.has(slot.id)}
							onSelect={canSelect ? (s) => handleSelect([s]) : undefined}
							label={label}
							pulse={pulse}
						/>
					)
				}}
				renderGroupActions={renderGroupActions}
				groupClassName={groupClassName}
			/>
		</>
	)
}
