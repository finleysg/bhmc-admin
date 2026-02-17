"use client"

import { useRegistration } from "@/lib/registration/registration-context"
import type { ServerRegistrationSlot } from "@/lib/registration/types"
import type { EventFee } from "@/lib/types"
import { SlotLineItem } from "./slot-line-item"

interface SlotGroupProps {
	eventFees: EventFee[]
	onPickPlayer: (slot: ServerRegistrationSlot) => void
}

export function SlotGroup({ eventFees, onPickPlayer }: SlotGroupProps) {
	const { registration, clubEvent } = useRegistration()

	if (!registration || !clubEvent) return null

	const teamSize = clubEvent.team_size ?? 1
	const hasTeams = teamSize > 1

	const getTeamNumber = (slotIndex: number) => {
		if (!hasTeams) return 0
		return Math.floor(slotIndex / teamSize) + 1
	}

	return (
		<div className="space-y-3">
			{registration.slots.map((slot, index) => {
				const team = getTeamNumber(index)
				const showTeamHeader =
					hasTeams && (index === 0 || getTeamNumber(index - 1) !== team)

				return (
					<div key={slot.id}>
						{showTeamHeader && (
							<h4 className="mb-1 text-sm font-semibold text-muted-foreground">
								Team {team}
							</h4>
						)}
						<SlotLineItem
							slot={slot}
							eventFees={eventFees}
							team={team}
							onPickPlayer={onPickPlayer}
						/>
					</div>
				)
			})}
		</div>
	)
}
