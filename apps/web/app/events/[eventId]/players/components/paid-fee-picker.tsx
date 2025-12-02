"use client"

import { useEffect, useState, useMemo } from "react"

import { calculateAmountDue, formatCurrency } from "@repo/domain/functions"

import { ValidatedClubEvent, ValidatedRegistrationSlot } from "@repo/domain/types"
import { PlayerFees } from "@/types/event-fee"
import { PlayerFeePicker } from "./player-fee-picker"
import { convertSlotsToPlayerFees } from "@/lib/fee-utils"

interface PaidFeePickerProps {
	clubEvent: ValidatedClubEvent
	slots: ValidatedRegistrationSlot[]
	onChange: (selections: { slotId: number; registrationFeeIds: number[] }[]) => void
}

/**
 * Renders a paid-fee selector UI for event registration and synchronizes selected fees with the parent.
 *
 * Loads initial fee selections from the provided slots, allows per-player fee selection (desktop grid and mobile card layouts),
 * computes subtotal, transaction fee, and total, and invokes `onChange` with the current selections whenever they change.
 *
 * @param clubEvent - The event object containing available event fees (used to render fee columns in display order).
 * @param slots - Registration slots to map selections back to slot IDs and to initialize per-player selections.
 * @param onChange - Callback invoked with an array of { slotId, registrationFeeIds } whenever selected fees change.
 * @returns The React element that renders the paid fee picker UI.
 */
export function PaidFeePicker({ clubEvent, slots, onChange }: PaidFeePickerProps) {
	const [playerFeesList, setPlayerFeesList] = useState<PlayerFees[]>([])

	const sortedEventFees = useMemo(() => {
		return [...clubEvent.eventFees].sort((a, b) => a.displayOrder - b.displayOrder)
	}, [clubEvent.eventFees])

	// Load initial selections from slots' paid fees
	useEffect(() => {
		const playerFees: PlayerFees[] = convertSlotsToPlayerFees(slots, sortedEventFees)
		setPlayerFeesList(playerFees)
		onChange(transformSelections(playerFees))
	}, [sortedEventFees, slots])

	const transformSelections = (playerFeesList: PlayerFees[]) => {
		if (!playerFeesList) return []

		return playerFeesList.map((pf) => {
			return {
				slotId: slots.find((s) => s.player.id === pf.playerId).id,
				registrationFeeIds: pf.fees.filter((f) => f.isSelected).map((f) => f.registrationFeeId),
			}
		})
	}

	const handleFeeChange = (playerId: number, feeId: number, isSelected: boolean) => {
		// Create a new playerFeesList with updated fee selection
		const updatedList = playerFeesList.map((pf) => {
			if (pf.playerId !== playerId) return pf
			const updatedFees = pf.fees.map((fee) => (fee.id === feeId ? { ...fee, isSelected } : fee))
			const subtotal = updatedFees.reduce((sum, f) => (f.isSelected ? f.amount + sum : sum), 0)
			return { ...pf, fees: updatedFees, subtotal }
		})
		setPlayerFeesList(updatedList)
		onChange(transformSelections(updatedList))
	}

	const selectedAmounts = playerFeesList.map((pf) => {
		return pf.subtotal
	})
	const amountDue = calculateAmountDue(selectedAmounts)

	// Desktop Grid Columns: Name (2fr) | Fees (1fr each) | Total (100px)
	const gridTemplateColumns = `2fr repeat(${sortedEventFees.length}, 1fr) 100px`

	return (
		<div className="w-full space-y-6">
			{/* Desktop View */}
			<div className="hidden lg:block overflow-x-auto">
				<div className="min-w-fit pr-4">
					{/* Header */}
					<div
						className="grid gap-4 items-end pb-4 font-normal text-sm text-base-content/80"
						style={{ gridTemplateColumns }}
					>
						<div></div> {/* Empty for Player Name */}
						{sortedEventFees.map((fee) => (
							<div key={fee.id} className="text-center leading-tight">
								{fee.feeType.name}
							</div>
						))}
						<div></div> {/* Empty for Total */}
					</div>

					{/* Player Rows */}
					<div className="space-y-4">
						{playerFeesList.map((pf) => (
							<PlayerFeePicker
								key={pf.playerId}
								playerFees={pf}
								onFeeChange={(feeId, isSelected) => handleFeeChange(pf.playerId, feeId, isSelected)}
								variant="desktop"
								gridTemplateColumns={gridTemplateColumns}
							/>
						))}
					</div>

					{/* Footer Summary */}
					<div className="mt-8 flex flex-col items-end space-y-1 text-sm">
						<div className="flex gap-8 justify-between w-64">
							<span className="text-base-content/70">Subtotal:</span>
							<span className="font-medium text-base">{formatCurrency(amountDue.subtotal)}</span>
						</div>
						<div className="flex gap-8 justify-between w-64">
							<span className="text-base-content/70">Transaction Fee:</span>
							<span className="font-medium text-base">
								{formatCurrency(amountDue.transactionFee)}
							</span>
						</div>
						<div className="flex gap-8 justify-between w-64 pt-2 border-t border-base-300 mt-2">
							<span className="font-bold text-base">Total:</span>
							<span className="font-bold text-lg">{formatCurrency(amountDue.total)}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile View (Card Layout) */}
			<div className="lg:hidden space-y-4">
				{playerFeesList.map((pf) => (
					<PlayerFeePicker
						key={pf.playerId}
						playerFees={pf}
						onFeeChange={(feeId, isSelected) => handleFeeChange(pf.playerId, feeId, isSelected)}
						variant="mobile"
					/>
				))}

				{/* Mobile Footer Summary */}
				<div className="card bg-base-100">
					<div className="card-body p-1 space-y-0">
						<div className="flex justify-between text-sm">
							<span>Subtotal:</span>
							<span>{formatCurrency(amountDue.subtotal)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span>Transaction Fee:</span>
							<span>{formatCurrency(amountDue.transactionFee)}</span>
						</div>
						<div className="flex justify-between text-accent font-bold border-t border-base-300 pt-1">
							<span>Total:</span>
							<span>{formatCurrency(amountDue.total)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}