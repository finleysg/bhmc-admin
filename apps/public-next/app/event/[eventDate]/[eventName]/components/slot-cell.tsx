"use client"

import { cn } from "@/lib/utils"
import type { ReserveSlot } from "@/lib/registration/reserve-utils"
import { RegistrationStatus } from "@/lib/registration/types"

interface SlotCellProps {
	slot: ReserveSlot
	courseColor?: string
	selected?: boolean
	onSelect?: (slot: ReserveSlot) => void
	label?: string
	pulse?: boolean
}

export function SlotCell({ slot, courseColor, selected, onSelect, label, pulse }: SlotCellProps) {
	const isReserved =
		slot.status === RegistrationStatus.Reserved || slot.status === RegistrationStatus.Processing
	const isOpen = slot.status === RegistrationStatus.Available
	const canInteract = onSelect && (isOpen || selected)

	const handleClick = () => {
		if (canInteract) {
			onSelect(slot)
		}
	}

	return (
		<div
			className={cn(
				"flex min-w-[140px] flex-1 items-center justify-center rounded-md border px-2 py-1 text-center text-sm",
				!isReserved && !selected && "bg-muted/30",
				selected && "border-primary bg-primary text-primary-foreground",
				canInteract && !selected && "cursor-pointer hover:border-primary/40",
				pulse && label && "animate-wave-pulse-bg",
			)}
			role={onSelect ? "button" : undefined}
			tabIndex={canInteract ? 0 : undefined}
			onClick={handleClick}
			onKeyDown={
				canInteract
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								handleClick()
							}
						}
					: undefined
			}
		>
			{isReserved && slot.playerName ? (
				<span className="font-medium text-secondary">{slot.playerName}</span>
			) : selected ? (
				<span className="font-medium">Selected</span>
			) : (
				<span
					className={cn(
						(!isOpen || label) && "text-muted-foreground",
						pulse && label && "animate-wave-pulse-text",
					)}
					style={isOpen && !label && courseColor ? { color: courseColor } : undefined}
				>
					{isOpen && label ? label : slot.statusName}
				</span>
			)}
		</div>
	)
}
