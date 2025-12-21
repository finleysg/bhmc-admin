"use client"

import type { ValidatedRegistration, Player } from "@repo/domain/types"

export interface SelectPlayersProps {
	group: ValidatedRegistration
	selectedPlayers?: Player[]
	onSelect: (player: Player) => void
	onRemove: (player: Player) => void
}

/**
 * Renders a list of players from a registration's slots as selectable checkboxes.
 *
 * Renders each player found in `group.slots` with a checkbox that reflects whether the player
 * is present in `selectedPlayers`. Toggling a checkbox calls `onSelect` when checked and
 * `onRemove` when unchecked.
 *
 * @param group - Registration object whose `slots` are used to build the player list
 * @param selectedPlayers - Currently selected players (defaults to an empty array)
 * @param onSelect - Called with a player when that player's checkbox is checked and they were not previously selected
 * @param onRemove - Called with a player when that player's checkbox is unchecked and they were previously selected
 * @returns A JSX element containing the list of player checkboxes
 */
export function SelectPlayers({
	group,
	selectedPlayers = [],
	onSelect,
	onRemove,
}: SelectPlayersProps) {
	// Extract all players from slots
	const slots = group.slots
	const players: Player[] = slots.map((slot) => slot.player).filter((p): p is Player => !!p)

	const isSelected = (player: Player) => selectedPlayers.some((p) => p.id === player.id)

	const handleChange = (player: Player, checked: boolean) => {
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
