"use client"

import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { ServerRegistration } from "@/lib/registration/types"

interface RegisteredPlayerSelectorProps {
	registration: ServerRegistration
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
		.filter((slot) => slot.player !== null)
		.map((slot) => ({
			id: slot.player!.id,
			name: `${slot.player!.firstName} ${slot.player!.lastName}`,
		}))

	const isSingleSelect = limit === 1
	const isAllSelected = players.length > 0 && selectedIds.length === players.length

	const handleToggle = (playerId: number) => {
		let next: number[]
		if (isSingleSelect) {
			next = [playerId]
		} else {
			next = selectedIds.includes(playerId)
				? selectedIds.filter((id) => id !== playerId)
				: [...selectedIds, playerId]
		}
		setSelectedIds(next)
		onChange(next)
	}

	const handleSelectAll = () => {
		const next = isAllSelected ? [] : players.map((p) => p.id)
		setSelectedIds(next)
		onChange(next)
	}

	return (
		<div className="space-y-2">
			{!isSingleSelect && (
				<div className="flex items-center gap-2 pb-1">
					<Checkbox id="select-all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
					<Label htmlFor="select-all" className="font-semibold">
						Select All
					</Label>
				</div>
			)}
			{players.map((player) => (
				<div key={player.id} className="flex items-center gap-2">
					<Checkbox
						id={`player-${player.id}`}
						checked={selectedIds.includes(player.id)}
						onCheckedChange={() => handleToggle(player.id)}
					/>
					<Label htmlFor={`player-${player.id}`}>{player.name}</Label>
				</div>
			))}
		</div>
	)
}
