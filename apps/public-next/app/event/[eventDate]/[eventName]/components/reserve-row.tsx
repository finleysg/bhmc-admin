"use client"

import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RegistrationStatus } from "@/lib/registration/types"
import type { ReserveGroup, ReserveSlot } from "@/lib/registration/reserve-utils"
import { ReserveSlotCell } from "./reserve-slot-cell"

interface ReserveRowProps {
	group: ReserveGroup
	mode: "view" | "edit"
	currentWave: number | null
	waveUnlockTimes?: Date[]
	onSelect: (slots: ReserveSlot[]) => void
	onReserve: () => void
}

export function ReserveRow({
	group,
	mode,
	currentWave,
	waveUnlockTimes,
	onSelect,
	onReserve,
}: ReserveRowProps) {
	const waveAvailable = currentWave === null || currentWave === 0 || currentWave >= group.wave

	const hasOpenings = group.slots.some((s) => s.status === RegistrationStatus.Available)
	const hasSelectedSlots = group.slots.some((s) => s.selected)

	const availabilityMessage = () => {
		if (waveAvailable) return undefined
		if (waveUnlockTimes && group.wave > 0 && group.wave <= waveUnlockTimes.length) {
			const unlockTime = waveUnlockTimes[group.wave - 1]
			return `Available at ${format(unlockTime, "h:mm a")}`
		}
		return `Wave ${group.wave}`
	}

	return (
		<div
			className={cn(
				"flex items-center gap-2 border-b py-2",
				!waveAvailable && "opacity-50",
			)}
		>
			{/* Group name */}
			<div className="w-20 shrink-0 text-sm font-medium">{group.name}</div>

			{/* Slot cells */}
			<div className="flex flex-1 gap-1.5">
				{group.slots.map((slot) => (
					<ReserveSlotCell
						key={slot.id}
						slot={slot}
						isAvailable={waveAvailable}
						onSelect={(s) => onSelect([s])}
					/>
				))}
			</div>

			{/* Actions (edit mode only) */}
			{mode === "edit" && (
				<div className="flex shrink-0 gap-1">
					<Button
						variant="secondary"
						size="xs"
						disabled={!hasOpenings || !waveAvailable}
						onClick={() => {
							const available = group.slots.filter(
								(s) => s.status === RegistrationStatus.Available,
							)
							onSelect(available)
						}}
					>
						Select
					</Button>
					<Button
						variant="default"
						size="xs"
						disabled={!hasSelectedSlots || !waveAvailable}
						onClick={onReserve}
					>
						Register
					</Button>
				</div>
			)}

			{/* Wave message */}
			{!waveAvailable && (
				<span className="text-xs text-muted-foreground">{availabilityMessage()}</span>
			)}
		</div>
	)
}
