import { ComponentPropsWithoutRef } from "react"
import { format } from "date-fns"

import { ReserveGroup, ReserveSlot } from "../../models/reserve"
import { ReserveCard } from "./reserve-card"

interface ReserveRowProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
	courseName: string
	group: ReserveGroup
	mode: "view" | "edit"
	wave: number
	waveUnlockTimes?: Date[]
	onSelect: (slot: ReserveSlot[]) => void
	onReserve: (groupName: string) => void
}

export function ReserveRow({
	courseName,
	group,
	mode,
	wave,
	waveUnlockTimes,
	onSelect,
	onReserve,
	...rest
}: ReserveRowProps) {
	const waveAvailable = () => {
		if (wave > 0) {
			return wave >= group.wave
		}
		return true
	}

	const availabilityMessage = () => {
		if (!waveAvailable()) {
			// Use dynamic wave unlock times if available
			if (waveUnlockTimes && group.wave > 0 && group.wave <= waveUnlockTimes.length) {
				const unlockTime = waveUnlockTimes[group.wave - 1] // waves are 1-based, array is 0-based
				return `Available at ${format(unlockTime, "h:mm a")}`
			}

			// Fallback to legacy hardcoded times
			let startTime = "5:00 PM"
			if (group.wave === 2) {
				startTime = "5:15 PM"
			} else if (group.wave === 3) {
				startTime = "5:30 PM"
			} else if (group.wave === 4) {
				startTime = "5:45 PM"
			}
			return `Available at ${startTime}`
		}
		return undefined
	}

	return (
		<div
			className={`reserve-group reserve-group__${courseName.toLowerCase()} ${!waveAvailable() ? "reserve-group__unavailable" : ""}`}
			{...rest}
		>
			<div className={mode === "edit" ? "reserve-group-name" : "reserved-group-name"}>
				<span>{group.name}</span>
				{mode === "edit" && (
					<>
						<button
							className="btn btn-sm btn-info"
							disabled={!group.hasOpenings() || !waveAvailable()}
							onClick={() => onSelect(group.slots)}
						>
							Select
						</button>
						<button
							className="btn btn-sm btn-warning"
							disabled={group.isDisabled() || !waveAvailable()}
							onClick={() => onReserve(group.name)}
						>
							Register
						</button>
					</>
				)}
			</div>
			{group.slots.map((slot) => (
				<ReserveCard
					key={slot.id}
					reserveSlot={slot}
					onSelect={(slot) => onSelect([slot])}
					isAvailable={waveAvailable()}
					availabilityText={availabilityMessage()}
				/>
			))}
		</div>
	)
}
