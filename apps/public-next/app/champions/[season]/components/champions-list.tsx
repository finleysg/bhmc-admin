"use client"

import { type ReactNode, useState } from "react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { MajorChampion } from "@/lib/types"
import { ChampionGroup } from "./champion-group"

interface ChampionsListProps {
	championsByEvent: [string, MajorChampion[]][]
	seasonSelector: ReactNode
}

export function ChampionsList({ championsByEvent, seasonSelector }: ChampionsListProps) {
	const [selectedEvent, setSelectedEvent] = useState("all")

	const filtered =
		selectedEvent === "all"
			? championsByEvent
			: championsByEvent.filter(([eventName]) => eventName === selectedEvent)

	return (
		<>
			<div className="mb-4 flex items-center gap-3">
				{seasonSelector}
				{championsByEvent.length > 1 && (
					<Select value={selectedEvent} onValueChange={setSelectedEvent}>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Events</SelectItem>
							{championsByEvent.map(([eventName]) => (
								<SelectItem key={eventName} value={eventName}>
									{eventName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>
			<div className="space-y-6">
				{filtered.map(([eventName, champs]) => (
					<ChampionGroup key={eventName} eventName={eventName} champions={champs} />
				))}
			</div>
		</>
	)
}
