import { ComponentPropsWithoutRef } from "react"

import { ReserveSlot } from "../../models/reserve"

interface ReserveCardProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
	reserveSlot: ReserveSlot
	isAvailable: boolean
	availabilityText?: string
	onSelect: (slot: ReserveSlot) => void
}

export function ReserveCard({
	reserveSlot,
	isAvailable,
	availabilityText,
	onSelect,
	...rest
}: ReserveCardProps) {
	const handleSelect = () => {
		if (isAvailable && reserveSlot.canSelect()) {
			onSelect(reserveSlot)
		}
	}

	const deriveClasses = () => {
		const className = "reserve-slot"
		if (reserveSlot.selected) {
			return className + " reserve-slot__selected"
		}
		return className + ` reserve-slot__${reserveSlot.statusName.toLowerCase().replace(" ", "-")}`
	}

	return (
		<div
			className={deriveClasses()}
			role="button"
			onClick={handleSelect}
			onKeyDown={handleSelect}
			tabIndex={0}
			{...rest}
		>
			{isAvailable || reserveSlot.statusName === "Reserved" ? (
				<span>{reserveSlot.displayText()}</span>
			) : (
				<span>{availabilityText}</span>
			)}
		</div>
	)
}
