import { rest } from "lodash"

import { RegistrationMode } from "../../context/registration-reducer"
import { SkinsType } from "../../models/codes"
import { EventFee } from "../../models/event-fee"
import { Payment } from "../../models/payment"
import { Player } from "../../models/player"
import { RegistrationFee, RegistrationSlot } from "../../models/registration"
import * as colors from "../../styles/colors"
import { EventFeeItem } from "./event-fee-item"
import { RegistrationSlotPlayer } from "./registration-slot-player"

interface RegistrationSlotLineItemProps {
	eventFees: EventFee[]
	existingFees: Map<string, RegistrationFee> | null
	mode: RegistrationMode
	payment: Payment
	player?: Player
	skinsType?: string | null
	slot: RegistrationSlot
	team: number
	onRemovePlayer: (slot: RegistrationSlot) => void
	onToggleFee: (action: "add" | "remove", slot: RegistrationSlot, fee: EventFee) => void
}

export function RegistrationSlotLineItem({
	eventFees,
	existingFees,
	mode,
	payment,
	player,
	skinsType,
	slot,
	team,
	onRemovePlayer,
	onToggleFee,
}: RegistrationSlotLineItemProps) {
	// If there is a payment object created, has a given fee been selected?
	const hasPaymentDetail = (eventFee: EventFee) => {
		if (payment && payment.details) {
			return payment.details.some((d) => d.eventFeeId === eventFee.id && d.slotId === slot.id)
		}
		return false
	}

	const getPlayerAmount = (eventFee: EventFee) => {
		if (!player) {
			return eventFee.amount
		}
		const existingDetail = payment.details.find((d) => d.eventFeeId === eventFee.id)
		if (existingDetail && existingDetail.amount > 0) {
			return existingDetail.amount
		}
		return eventFee.amountDue(player)
	}

	const slotTotal = () => {
		return payment.details.filter((d) => d.slotId === slot.id).reduce((acc, d) => acc + d.amount, 0)
	}

	const handleToggleFee = (fee: EventFee, isSelected: boolean) => {
		if (mode === "edit") {
			onToggleFee(isSelected ? "remove" : "add", slot, fee)
		} else {
			if (hasPaymentDetail(fee)) {
				onToggleFee("remove", slot, fee)
			} else {
				onToggleFee("add", slot, fee)
			}
		}
	}

	const allowTeamFee = (eventFee: EventFee) => {
		if (eventFee.isSkinsFee && skinsType === SkinsType.Team) {
			// only allow team fee for the first player on a team
			if (team === 1) {
				return slot.slot === 0
			} else if (team === 2) {
				return slot.slot === 2
			} else {
				return false
			}
		}
		return true // no team restriction
	}

	return (
		<div
			className="slot"
			style={{ backgroundColor: colors.gray50 }}
			data-testid="registration-slot"
		>
			<RegistrationSlotPlayer slot={slot} onRemovePlayer={onRemovePlayer} mode={mode} team={team} />
			<div className="fees">
				{eventFees.map((eventFee) => {
					const existing = existingFees?.get(`${slot.id}-${eventFee.id}`) !== undefined
					return (
						<EventFeeItem
							key={eventFee.id * slot.id}
							fee={eventFee}
							playerAmount={getPlayerAmount(eventFee)}
							mode={mode}
							playerId={slot.playerId}
							selected={hasPaymentDetail(eventFee) || existing}
							disabled={slot.playerId === 0 || existing || !allowTeamFee(eventFee)}
							onToggleFee={handleToggleFee}
							{...rest}
						/>
					)
				})}
			</div>
			<div className="subtotal" data-testid={`subtotal-${slot.slot}`}>
				${slotTotal().toFixed(2)}
			</div>
		</div>
	)
}
