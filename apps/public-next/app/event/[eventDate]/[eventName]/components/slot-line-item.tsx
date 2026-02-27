"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useRegistration } from "@/lib/registration/registration-context"
import {
	calculateFeeAmount,
	evaluateRestriction,
	type FeePlayer,
} from "@/lib/registration/fee-utils"
import type { ServerRegistrationSlot } from "@/lib/registration/types"
import type { EventFee } from "@/lib/types"

interface SlotLineItemProps {
	slot: ServerRegistrationSlot
	eventFees: EventFee[]
	team: number
	onPickPlayer: (slot: ServerRegistrationSlot) => void
	layout?: "horizontal" | "vertical"
}

export function SlotLineItem({
	slot,
	eventFees,
	team,
	onPickPlayer,
	layout = "vertical",
}: SlotLineItemProps) {
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

	const playerContent = player ? (
		<>
			<span className="truncate text-sm font-medium text-emerald-600 dark:text-emerald-400">
				{player.firstName} {player.lastName}
			</span>
			{slot.slot !== 0 && (
				<Button
					variant="ghost"
					size="icon-xs"
					className="shrink-0 text-destructive hover:text-destructive"
					onClick={() => removePlayer(slot)}
					aria-label="Remove player"
				>
					<X className="size-3.5" />
				</Button>
			)}
		</>
	) : (
		<button
			type="button"
			className="text-sm text-muted-foreground hover:text-primary"
			onClick={() => onPickPlayer(slot)}
		>
			Add a player
		</button>
	)

	if (layout === "horizontal") {
		return (
			<div className="space-y-1 rounded-md bg-muted/30 py-2" data-testid="registration-slot">
				{/* Mobile: player name on its own line */}
				<div className="flex items-center gap-1.5 overflow-hidden md:hidden">{playerContent}</div>

				{/* Checkbox grid */}
				<div
					className="grid items-center gap-x-2 grid-cols-[repeat(var(--fee-count),1fr)_4.5rem] md:grid-cols-[1fr_repeat(var(--fee-count),3rem)_4.5rem]"
					style={{ "--fee-count": eventFees.length } as React.CSSProperties}
				>
					{/* Desktop: player name in grid / Mobile: empty spacer */}
					<div className="hidden items-center gap-1.5 overflow-hidden md:flex">{playerContent}</div>

					{/* Fee checkboxes */}
					{eventFees.map((eventFee) => {
						const existing = isExistingFee(eventFee)
						const selected = hasPaymentDetail(eventFee) || existing
						const disabled = !player || existing || eventFee.is_required
						const applicable = isFeeApplicable(eventFee)
						const id = `fee-${slot.id}-${eventFee.id}`

						return (
							<div key={id} className="flex justify-center">
								<Checkbox
									id={id}
									checked={selected}
									disabled={disabled || (!applicable && !selected)}
									onCheckedChange={() => handleToggleFee(eventFee)}
								/>
							</div>
						)
					})}

					{/* Subtotal */}
					<div className="text-right text-sm font-medium" data-testid={`subtotal-${slot.slot}`}>
						${slotTotal().toFixed(2)}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="rounded-md border bg-muted/30 p-3" data-testid="registration-slot">
			{/* Player section */}
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					{team > 0 && <span className="text-xs text-muted-foreground">Team {team}</span>}
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
