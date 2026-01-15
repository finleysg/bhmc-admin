import React from "react"

import { RegistrationMode } from "../../context/registration-reducer"
import { RegistrationSlot } from "../../models/registration"

interface RegistrationSlotPlayerProps {
	slot: RegistrationSlot
	mode: RegistrationMode
	team: number
	onRemovePlayer: (slot: RegistrationSlot) => void
}

export function RegistrationSlotPlayer({
	slot,
	mode,
	team,
	onRemovePlayer,
}: RegistrationSlotPlayerProps) {
	return (
		<div className="player">
			{mode === "new" && slot.playerId === 0 && (
				<span className="text-secondary">Add a player</span>
			)}
			{slot.playerId !== 0 && (
				<React.Fragment>
					<span className="text-success">{slot.playerName}</span>
					{team > 0 && <span className="text-success ms-1">- team {team}</span>}
					{mode === "new" && slot.slot > 0 && (
						<span className="ms-2">
							<button
								className="btn btn-link text-success-emphasis p-0 align-top"
								onClick={() => onRemovePlayer(slot)}
							>
								(remove)
							</button>
						</span>
					)}
				</React.Fragment>
			)}
		</div>
	)
}
