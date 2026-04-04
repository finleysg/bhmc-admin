"use client"

import { type ReactNode, useState } from "react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { ChampionEventGroup } from "../page"
import { ChampionGroup } from "./champion-group"

interface ChampionsListProps {
	groups: ChampionEventGroup[]
	seasonSelector: ReactNode
}

export function ChampionsList({ groups, seasonSelector }: ChampionsListProps) {
	const [selectedEvent, setSelectedEvent] = useState("all")

	const lastEventKey = groups[groups.length - 1]?.eventKey
	const [openEvents, setOpenEvents] = useState<Set<string>>(
		() => new Set(lastEventKey ? [lastEventKey] : []),
	)

	const filtered =
		selectedEvent === "all" ? groups : groups.filter((g) => g.eventKey === selectedEvent)

	function toggleEvent(eventKey: string, open: boolean) {
		setOpenEvents((prev) => {
			const next = new Set(prev)
			if (open) {
				next.add(eventKey)
			} else {
				next.delete(eventKey)
			}
			return next
		})
	}

	return (
		<>
			<div className="mb-4 flex items-center gap-3">
				{seasonSelector}
				{groups.length > 1 && (
					<Select value={selectedEvent} onValueChange={setSelectedEvent}>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Events</SelectItem>
							{groups.map((g) => (
								<SelectItem key={g.eventKey} value={g.eventKey}>
									{g.eventName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>
			<div className="space-y-6">
				{filtered.map((g) => (
					<ChampionGroup
						key={g.eventKey}
						eventName={g.eventName}
						eventStartDate={g.eventStartDate}
						champions={g.champions}
						isOpen={openEvents.has(g.eventKey)}
						onToggle={(open) => toggleEvent(g.eventKey, open)}
					/>
				))}
			</div>
		</>
	)
}
