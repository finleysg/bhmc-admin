"use client"

import type { EventFeeWithType as EventFee, Player } from "@repo/domain/types"
import { formatCurrency, getAmount, getTotalAmountForPlayer } from "@repo/domain/functions"

interface PlayerEventFeePickerProps {
	player: Player
	fees: EventFee[]
	selectedFeeIds: number[]
	onToggle: (feeId: number) => void
	variant: "desktop" | "mobile"
	gridTemplateColumns?: string
}

export function PlayerEventFeePicker({
	player,
	fees,
	selectedFeeIds,
	onToggle,
	variant,
	gridTemplateColumns,
}: PlayerEventFeePickerProps) {
	const playerTotal = getTotalAmountForPlayer(
		player,
		fees.filter((fee) => selectedFeeIds.includes(fee.id)),
	)

	if (variant === "desktop") {
		return (
			<div className="grid gap-4 items-center" style={{ gridTemplateColumns }}>
				{/* Player Name */}
				<div className="flex flex-col items-start">
					<span className="text-info">
						{player.firstName} {player.lastName}
					</span>
				</div>

				{/* Checkboxes */}
				{fees.map((fee) => (
					<div key={fee.id} className="flex justify-center">
						<input
							type="checkbox"
							className="checkbox checkbox-sm"
							checked={selectedFeeIds.includes(fee.id)}
							disabled={fee.isRequired}
							onChange={() => onToggle(fee.id)}
						/>
					</div>
				))}

				{/* Player Total */}
				<div className="text-right">{formatCurrency(playerTotal.subtotal)}</div>
			</div>
		)
	}

	// Mobile view
	return (
		<div className="card bg-base-100">
			<div className="card-body p-1">
				<div className="flex justify-between items-start">
					<span className="text-lg text-secondary font-semibold">
						{player.firstName} {player.lastName}
					</span>
					<span className="text-secondary font-semibold">
						{formatCurrency(playerTotal.subtotal)}
					</span>
				</div>

				<div className="space-y-2">
					{fees.map((fee) => (
						<label key={fee.id} className="flex justify-between">
							<div className="flex gap-3">
								<input
									type="checkbox"
									className="checkbox checkbox-sm"
									checked={selectedFeeIds.includes(fee.id)}
									disabled={fee.isRequired}
									onChange={() => onToggle(fee.id)}
								/>
								<span className="text-sm">{fee.feeType?.name || "Fee"}</span>
							</div>
							<span className="text-sm text-base-content/70">
								{formatCurrency(getAmount(fee, player))}
							</span>
						</label>
					))}
				</div>

				<div className="divider my-0"></div>
			</div>
		</div>
	)
}
