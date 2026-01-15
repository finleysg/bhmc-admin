import { RegistrationMode } from "../../context/registration-reducer"
import { usePlayers } from "../../hooks/use-players"
import { EventFee } from "../../models/event-fee"
import { Payment } from "../../models/payment"
import { Player } from "../../models/player"
import { Registration, RegistrationFee, RegistrationSlot } from "../../models/registration"
import { EventFeeHeader } from "./event-fee-header"
import { RegistrationSlotLineItem } from "./registration-slot-line-item"

interface RegistrationSlotGroupProps {
	eventFees: EventFee[]
	existingFees: Map<string, RegistrationFee> | null
	layout: "horizontal" | "vertical"
	mode: RegistrationMode
	payment: Payment
	registration: Registration
	skinsType?: string | null
	teamSize: number
	addFee: (slot: RegistrationSlot, fee: EventFee, player: Player) => void
	removeFee: (slot: RegistrationSlot, fee: EventFee) => void
	removePlayer: (slot: RegistrationSlot) => void
}
export function RegistrationSlotGroup({
	eventFees,
	existingFees,
	layout,
	mode,
	payment,
	registration,
	skinsType,
	teamSize,
	addFee,
	removeFee,
	removePlayer,
}: RegistrationSlotGroupProps) {
	const { data: players } = usePlayers()

	const handleRemovePlayer = (slot: RegistrationSlot) => {
		removePlayer(slot)
	}

	const handleToggleFee = (action: "add" | "remove", slot: RegistrationSlot, fee: EventFee) => {
		if (action === "add") {
			const player = players?.find((p) => p.id === slot.playerId)
			if (player) {
				addFee(slot, fee, player)
			}
		} else if (action === "remove") {
			removeFee(slot, fee)
		}
	}

	return (
		<div className={layout === "horizontal" ? "hgroup" : "vgroup"}>
			{layout === "horizontal" && <EventFeeHeader eventFees={eventFees} />}
			{registration.slots.map((slot) => {
				const player = players?.find((p) => p.id === slot.playerId)
				return (
					<RegistrationSlotLineItem
						key={slot.id}
						slot={slot}
						mode={mode}
						payment={payment}
						player={player}
						eventFees={eventFees}
						existingFees={existingFees}
						onRemovePlayer={handleRemovePlayer}
						onToggleFee={handleToggleFee}
						team={slot.getTeamNumber(teamSize)}
						skinsType={skinsType}
					/>
				)
			})}
		</div>
	)
}
