import { z } from "zod"

import { Player, PlayerApiSchema } from "./player"

export const MajorChampionApiSchema = z.object({
	id: z.number(),
	player: PlayerApiSchema,
	season: z.number(),
	event_name: z.string(),
	event: z.number().nullish(),
	flight: z.string(),
	team_id: z.string().nullish(),
	score: z.number(),
	is_net: z.boolean(),
})

export type MajorChampionData = z.infer<typeof MajorChampionApiSchema>

export class MajorChampion {
	id: number
	player: Player
	season: number
	eventId?: number | null
	eventName: string
	flight: string
	teamId?: string | null
	score: number
	isNet: boolean

	constructor(data: MajorChampionData) {
		this.id = data.id
		this.player = new Player(data.player)
		this.season = data.season
		this.eventId = data.event
		this.eventName = data.event_name
		this.flight = data.flight
		this.teamId = data.team_id
		this.score = data.score
		this.isNet = data.is_net
	}

	flightDisplay = () => {
		return this.isNet ? `${this.flight} (net)` : `${this.flight} (gross)`
	}
}
