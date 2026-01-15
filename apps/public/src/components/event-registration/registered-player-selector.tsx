import { useState, useEffect } from "react"
import type { Registration } from "../../models/registration"

interface RegisteredPlayerSelectorProps {
	registration: Registration
	limit?: number
	onChange: (playerIds: number[]) => void
}

export function RegisteredPlayerSelector({
	registration,
	limit,
	onChange,
}: RegisteredPlayerSelectorProps) {
	const [selectedIds, setSelectedIds] = useState<number[]>([])

	const players = registration.slots
		.filter((slot) => slot.playerId && slot.playerName)
		.map((slot) => ({ id: slot.playerId, name: slot.playerName! }))

	const isSingleSelect = limit === 1
	const canSelectAll = !limit || limit >= players.length
	const isAllSelected = selectedIds.length === players.length
	const atLimit = limit !== undefined && selectedIds.length >= limit

	useEffect(() => {
		onChange(selectedIds)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedIds])

	const handleToggle = (playerId: number) => {
		if (isSingleSelect) {
			setSelectedIds([playerId])
		} else {
			setSelectedIds((prev) =>
				prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
			)
		}
	}

	const handleSelectAll = () => {
		if (isAllSelected) {
			setSelectedIds([])
		} else {
			setSelectedIds(players.map((p) => p.id))
		}
	}

	return (
		<div>
			{!isSingleSelect && (
				<div className="form-check mb-2">
					<input
						type="checkbox"
						className="form-check-input"
						id="select-all"
						checked={isAllSelected}
						disabled={!canSelectAll}
						onChange={handleSelectAll}
					/>
					<label className="form-check-label fw-semibold" htmlFor="select-all">
						Select All
					</label>
				</div>
			)}
			{players.map((player) => {
				const isSelected = selectedIds.includes(player.id)
				const isDisabled = !isSelected && atLimit && limit > 1

				return (
					<div key={player.id} className="form-check">
						<input
							type={isSingleSelect ? "radio" : "checkbox"}
							className="form-check-input"
							id={`player-${player.id}`}
							name={isSingleSelect ? "player-select" : undefined}
							checked={isSelected}
							disabled={isDisabled}
							onChange={() => handleToggle(player.id)}
						/>
						<label className="form-check-label" htmlFor={`player-${player.id}`}>
							{player.name}
						</label>
					</div>
				)
			})}
		</div>
	)
}
