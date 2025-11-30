"use client"

import type { ValidatedRegistration, ValidatedPlayer } from "@repo/domain/types"

export interface SelectPlayersProps {
	group: ValidatedRegistration
	selectedPlayers?: ValidatedPlayer[]
	onSelect: (player: ValidatedPlayer) => void
	onRemove: (player: ValidatedPlayer) => void
}

export function SelectPlayers({
	group,
	selectedPlayers = [],
	onSelect,
	onRemove,
}: SelectPlayersProps) {
	// Extract all players from slots
	const slots = group.slots
	const players: ValidatedPlayer[] = slots
		.map((slot) => slot.player)
		.filter((p): p is ValidatedPlayer => !!p)

	const isSelected = (player: ValidatedPlayer) => selectedPlayers.some((p) => p.id === player.id)

	const handleChange = (player: ValidatedPlayer, checked: boolean) => {
		if (checked) {
			if (!isSelected(player)) {
				onSelect(player)
			}
		} else {
			if (isSelected(player)) {
				onRemove(player)
			}
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{players.map((player) => (
				<div key={player.id} className="form-control flex-row items-center gap-2">
					<input
						type="checkbox"
						className="checkbox checkbox-sm me-2"
						checked={isSelected(player)}
						onChange={(e) => handleChange(player, e.target.checked)}
						id={`player-checkbox-${player.id}`}
					/>
					<label htmlFor={`player-checkbox-${player.id}`} className="label cursor-pointer">
						<span className="label-text">
							{player.firstName} {player.lastName}
						</span>
					</label>
				</div>
			))}
		</div>
	)
}

export default SelectPlayers
