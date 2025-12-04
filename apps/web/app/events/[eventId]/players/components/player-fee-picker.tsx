"use client"

import { formatCurrency } from "@repo/domain/functions"
import { Fee, PlayerFees } from "@/types/event-fee"

interface PlayerFeePickerProps {
	playerFees: PlayerFees
	onFeeChange: (feeId: number, isSelected: boolean) => void
	variant: "desktop" | "mobile"
	gridTemplateColumns?: string
}

/**
 * Renders a per-player fee selection UI in either a desktop grid or a mobile card layout.
 *
 * The component shows the player's name, each fee with a checkbox reflecting selection state,
 * and the player's subtotal formatted as currency. Checkboxes are disabled when a fee's `canChange`
 * is false; interacting with an enabled checkbox invokes `onFeeChange` with the fee's id and the
 * toggled selection state.
 *
 * @param playerFees - Player-specific fees, player name, and subtotal to display
 * @param onFeeChange - Callback invoked with `(feeId, isSelected)` when a fee selection changes
 * @param variant - Layout variant to render: `"desktop"` or `"mobile"`
 * @param gridTemplateColumns - Optional CSS grid template columns string used by the desktop layout
 * @returns A React element rendering the player's fee picker UI for the requested variant
 */
export function PlayerFeePicker({
	playerFees,
	onFeeChange,
	variant,
	gridTemplateColumns,
}: PlayerFeePickerProps) {
	const handleChange = (fee: Fee) => {
		if (!fee.canChange) return
		onFeeChange(fee.id, !fee.isSelected)
	}

	if (variant === "desktop") {
		return (
			<div className="grid gap-4 items-center" style={{ gridTemplateColumns }}>
				{/* Player Name */}
				<div className="flex flex-col items-start">
					<span className="text-info">{playerFees.playerName}</span>
				</div>

				{/* Checkboxes */}
				{playerFees.fees.map((fee) => (
					<div key={fee.id} className="flex justify-center">
						<input
							type="checkbox"
							className="checkbox checkbox-sm"
							checked={fee.isSelected}
							disabled={!fee.canChange}
							onChange={() => handleChange(fee)}
						/>
					</div>
				))}

				{/* Player Total */}
				<div className="text-right">{formatCurrency(playerFees.subtotal)}</div>
			</div>
		)
	}

	// Mobile view
	return (
		<div className="card bg-base-100">
			<div className="card-body p-1">
				<div className="flex justify-between items-start">
					<span className="text-lg text-secondary font-semibold">{playerFees.playerName}</span>
					<span className="text-secondary font-semibold">
						{formatCurrency(playerFees.subtotal)}
					</span>
				</div>

				<div className="space-y-2">
					{playerFees.fees.map((fee) => (
						<label key={fee.id} className="flex items-center justify-between">
							<span className="text-sm">{fee.name || "Fee"}</span>
							<div className="flex items-center gap-2">
								<span className="text-sm text-base-content/70">{formatCurrency(fee.amount)}</span>
								<input
									type="checkbox"
									className="checkbox checkbox-sm"
									checked={fee.isSelected}
									disabled={!fee.canChange}
									onChange={() => handleChange(fee)}
								/>
							</div>
						</label>
					))}
				</div>

				<div className="divider my-0"></div>
			</div>
		</div>
	)
}
