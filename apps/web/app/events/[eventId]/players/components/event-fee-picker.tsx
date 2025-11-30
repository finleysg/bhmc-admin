"use client"

import { useEffect, useState } from "react"

import { calculateAmountDue, formatCurrency, getAmount } from "@repo/domain/functions"
import type { ValidatedEventFee as EventFee, ValidatedPlayer as Player } from "@repo/domain/types"

import { PlayerEventFeePicker } from "./player-event-fee-picker"

interface EventFeePickerProps {
	fees: EventFee[]
	players: Player[]
	onChange: (selections: { playerId: number; eventFeeId: number }[]) => void
}

export function EventFeePicker({ fees, players, onChange }: EventFeePickerProps) {
	const [selections, setSelections] = useState<{ playerId: number; eventFeeId: number }[]>([])

	// Initialize with required fees on mount or when data changes
	useEffect(() => {
		setSelections((prev) => {
			const newSelections = [...prev]
			// 1. Filter out invalid players (if a player was removed)
			const currentIds = new Set(players.map((p) => p.id))
			let filtered = newSelections.filter((s) => currentIds.has(s.playerId))

			// 2. Ensure required fees are selected for all current players
			let changed = filtered.length !== prev.length // Track if filtering changed anything

			for (const player of players) {
				for (const fee of fees) {
					if (fee.isRequired) {
						const exists = filtered.some((s) => s.playerId === player.id && s.eventFeeId === fee.id)
						if (!exists) {
							filtered.push({
								playerId: player.id,
								eventFeeId: fee.id,
							})
							changed = true
						}
					}
				}
			}

			// Only update state if something actually changed to avoid unnecessary re-renders
			return changed ? filtered : prev
		})
	}, [fees, players])

	// Emit changes whenever selections change
	useEffect(() => {
		onChange(selections)
	}, [selections, onChange])

	const handleToggle = (playerId: number, feeId: number) => {
		setSelections((prev) => {
			const existing = prev.find((s) => s.playerId === playerId && s.eventFeeId === feeId)
			if (existing) {
				return prev.filter((s) => !(s.playerId === playerId && s.eventFeeId === feeId))
			} else {
				return [...prev, { playerId, eventFeeId: feeId }]
			}
		})
	}

	const selectedFees = selections.map((selection) => {
		const fee = fees.find((f) => f.id === selection.eventFeeId)
		const player = players.find((p) => p.id === selection.playerId)
		if (!fee || !player) {
			console.warn("Unexpected selection found:", selection)
			return 0
		}
		return getAmount(fee, player)
	})

	const amountDue = calculateAmountDue(selectedFees)

	// Desktop Grid Columns: Name (2fr) | Fees (1fr each) | Total (100px)
	const gridTemplateColumns = `2fr repeat(${fees.length}, 1fr) 100px`

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
						{fees.map((fee) => (
							<div key={fee.id} className="text-center leading-tight">
								{fee.feeType?.name || "Fee"}
							</div>
						))}
						<div></div> {/* Empty for Total */}
					</div>

					{/* Player Rows */}
					<div className="space-y-4">
						{players.map((player) => (
							<PlayerEventFeePicker
								key={player.id}
								player={player}
								fees={fees}
								selectedFeeIds={selections
									.filter((s) => s.playerId === player.id)
									.map((s) => s.eventFeeId)}
								onToggle={(feeId) => handleToggle(player.id, feeId)}
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
							<span className="text-base-content/70">Transaction (30¢ + 2.9%):</span>
							<span className="font-medium text-base">
								{formatCurrency(amountDue.transactionFee)}
							</span>
						</div>
						<div className="flex gap-8 justify-between w-64 pt-2 border-t border-base-300 mt-2">
							<span className="font-bold text-base">Total amount due:</span>
							<span className="font-bold text-lg">{formatCurrency(amountDue.total)}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile View (Card Layout) */}
			<div className="lg:hidden space-y-4">
				{players.map((player) => (
					<PlayerEventFeePicker
						key={player.id}
						player={player}
						fees={fees}
						selectedFeeIds={selections
							.filter((s) => s.playerId === player.id)
							.map((s) => s.eventFeeId)}
						onToggle={(feeId) => handleToggle(player.id, feeId)}
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
							<span>Total Due:</span>
							<span>{formatCurrency(amountDue.total)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
