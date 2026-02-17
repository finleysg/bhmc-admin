"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReserveSlot } from "@/lib/registration/reserve-utils"
import { RegistrationStatus } from "@/lib/registration/types"

interface ReserveSlotCellProps {
	slot: ReserveSlot
	isAvailable: boolean
	onSelect: (slot: ReserveSlot) => void
}

function getSlotVariant(slot: ReserveSlot): {
	variant: "outline" | "default" | "secondary" | "destructive"
	className: string
} {
	if (slot.selected) {
		return { variant: "default", className: "cursor-pointer" }
	}
	switch (slot.status) {
		case RegistrationStatus.Available:
			return { variant: "outline", className: "cursor-pointer hover:border-primary" }
		case RegistrationStatus.Reserved:
			return { variant: "secondary", className: "" }
		case RegistrationStatus.Processing:
			return {
				variant: "outline",
				className: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
			}
		case RegistrationStatus.InProgress:
			return {
				variant: "outline",
				className: "border-muted-foreground/30 text-muted-foreground",
			}
		default:
			return { variant: "outline", className: "opacity-50" }
	}
}

function getDisplayText(slot: ReserveSlot): string {
	if (slot.status === RegistrationStatus.Reserved && slot.playerName) {
		return slot.playerName.charAt(0).toUpperCase()
	}
	if (slot.status === RegistrationStatus.Available) {
		return String(slot.position + 1)
	}
	if (slot.status === RegistrationStatus.Processing) {
		return "..."
	}
	return ""
}

export function ReserveSlotCell({ slot, isAvailable, onSelect }: ReserveSlotCellProps) {
	const { variant, className } = getSlotVariant(slot)
	const canSelect = isAvailable && slot.status === RegistrationStatus.Available && !slot.selected

	const handleClick = () => {
		if (isAvailable && (slot.status === RegistrationStatus.Available || slot.selected)) {
			onSelect(slot)
		}
	}

	return (
		<Badge
			variant={variant}
			className={cn(
				"inline-flex h-8 w-8 items-center justify-center rounded-md text-xs",
				canSelect || slot.selected ? "cursor-pointer" : "cursor-default",
				className,
			)}
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					handleClick()
				}
			}}
		>
			{getDisplayText(slot)}
		</Badge>
	)
}
