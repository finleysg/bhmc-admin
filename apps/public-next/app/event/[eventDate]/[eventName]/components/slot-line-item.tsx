"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useRegistration } from "@/lib/registration/registration-context"
import { calculateFeeAmount, evaluateRestriction, type FeePlayer } from "@/lib/registration/fee-utils"
import type { ServerRegistrationSlot } from "@/lib/registration/types"
import type { EventFee } from "@/lib/types"

interface SlotLineItemProps {
	slot: ServerRegistrationSlot
	eventFees: EventFee[]
	team: number
	onPickPlayer: (slot: ServerRegistrationSlot) => void
}

export function SlotLineItem({ slot, eventFees, team, onPickPlayer }: SlotLineItemProps) {
	const { payment, existingFees, addFee, removeFee, removePlayer } = useRegistration()

	const player = slot.player
	const feePlayer: FeePlayer | undefined = player
		? {
				birthDate: player.birthDate,
				isMember: !!player.isMember,
				lastSeason: player.lastSeason,
			}
		: undefined

	const hasPaymentDetail = (eventFee: EventFee) => {
		return (
			payment?.details.some(
				(d) => d.eventFeeId === eventFee.id && d.registrationSlotId === slot.id,
			) ?? false
		)
	}

	const isExistingFee = (eventFee: EventFee) => {
		return existingFees?.has(`${slot.id}-${eventFee.id}`) ?? false
	}

	const getFeeAmount = (eventFee: EventFee) => {
		const existingDetail = payment?.details.find(
			(d) => d.eventFeeId === eventFee.id && d.registrationSlotId === slot.id,
		)
		if (existingDetail && existingDetail.amount && existingDetail.amount > 0) {
			return existingDetail.amount
		}
		return calculateFeeAmount(eventFee, feePlayer)
	}

	const slotTotal = () => {
		return (
			payment?.details
				.filter((d) => d.registrationSlotId === slot.id)
				.reduce((acc, d) => acc + (d.amount ?? 0), 0) ?? 0
		)
	}

	const handleToggleFee = (eventFee: EventFee) => {
		if (!feePlayer) return
		if (hasPaymentDetail(eventFee)) {
			removeFee(slot, eventFee)
		} else {
			addFee(slot, eventFee, feePlayer)
		}
	}

	const isFeeApplicable = (eventFee: EventFee) => {
		if (!feePlayer || !eventFee.fee_type.restriction) return true
		if (eventFee.fee_type.restriction === "None") return true
		return evaluateRestriction(eventFee.fee_type.restriction, feePlayer)
	}

	return (
		<div className="rounded-md border bg-muted/30 p-3" data-testid="registration-slot">
			{/* Player section */}
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					{team > 0 && (
						<span className="text-xs text-muted-foreground">Team {team}</span>
					)}
					{player ? (
						<span className="font-medium">
							{player.firstName} {player.lastName}
						</span>
					) : (
						<button
							type="button"
							className="text-sm text-primary underline-offset-4 hover:underline"
							onClick={() => onPickPlayer(slot)}
						>
							Add a player
						</button>
					)}
				</div>
				{player && slot.slot !== 0 && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => removePlayer(slot)}
						aria-label="Remove player"
					>
						<X className="size-3.5" />
					</Button>
				)}
			</div>

			{/* Fees section */}
			<div className="space-y-1.5">
				{eventFees.map((eventFee) => {
					const existing = isExistingFee(eventFee)
					const selected = hasPaymentDetail(eventFee) || existing
					const disabled = !player || existing || eventFee.is_required
					const applicable = isFeeApplicable(eventFee)
					const amount = getFeeAmount(eventFee)
					const id = `fee-${slot.id}-${eventFee.id}`

					if (!applicable && !selected) return null

					return (
						<div key={id} className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Checkbox
									id={id}
									checked={selected}
									disabled={disabled}
									onCheckedChange={() => handleToggleFee(eventFee)}
								/>
								<Label
									htmlFor={id}
									className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									{eventFee.fee_type.name}
								</Label>
							</div>
							<span className="text-sm">${amount.toFixed(2)}</span>
						</div>
					)
				})}
			</div>

			{/* Subtotal */}
			<div className="mt-2 flex justify-end border-t pt-1.5">
				<span className="text-sm font-medium" data-testid={`subtotal-${slot.slot}`}>
					${slotTotal().toFixed(2)}
				</span>
			</div>
		</div>
	)
}
