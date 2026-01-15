import { useState } from "react"

import { PeoplePicker } from "../../components/directory/people-picker"
import { ClubEvent } from "../../models/club-event"
import { Player } from "../../models/player"
import { ReserveSlot } from "../../models/reserve"

interface SwapPlayersProps {
	clubEvent: ClubEvent
	slot: ReserveSlot
	onSwap: (player: Player) => void
	onCancel: () => void
}

export function SwapPlayers({ clubEvent, slot, onSwap, onCancel }: SwapPlayersProps) {
	const [newPlayer, setNewPlayer] = useState<Player | null>(null)

	const handleSelect = (player: Player) => {
		setNewPlayer(player)
	}

	const handleSwap = () => {
		if (newPlayer) {
			onSwap(newPlayer)
			setNewPlayer(null)
		}
	}

	return (
		<div className="card border border-warning">
			<div className="card-body">
				<h4 className="card-header text-warning mb-2">Swap for {slot.playerName}</h4>
				<PeoplePicker allowNew={false} clubEvent={clubEvent} onSelect={handleSelect} />
				<p className="mt-2 fw-bold text-warning-emphasis">
					Selected player: {newPlayer ? newPlayer.name : "none selected"}
				</p>
				<div className="card-footer d-flex justify-content-end pb-0">
					<button className="btn btn-light btn-sm me-2 mt-2" onClick={onCancel}>
						Cancel
					</button>
					<button
						disabled={!newPlayer}
						className="btn btn-warning btn-sm mt-2"
						onClick={handleSwap}
					>
						Confirm Swap
					</button>
				</div>
			</div>
		</div>
	)
}
