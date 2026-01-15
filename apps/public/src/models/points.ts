import { z } from "zod"

import { SimpleEvent, SimpleEventApiSchema } from "./club-event"
import { PlayerApiSchema } from "./player"

export const TopPointsSchema = z.object({
	id: z.number(),
	first_name: z.string(),
	last_name: z.string(),
	total_points: z.number(),
})

export type TopPointsData = z.infer<typeof TopPointsSchema>

export class TopPoints {
	id: number
	name: string
	points: number

	constructor(data: TopPointsData) {
		this.id = data.id
		this.name = `${data.first_name} ${data.last_name}`
		this.points = data.total_points
	}
}

export const PointsApiSchema = z.object({
	id: z.number(),
	player: PlayerApiSchema,
	gross_points: z.number().nullish(),
	net_points: z.number().nullish(),
	additional_info: z.string(),
})

export type PointsData = z.infer<typeof PointsApiSchema>

export class Points {
	id: number
	name: string
	category: string
	grossPoints: number
	netPoints: number

	constructor(data: PointsData) {
		this.id = data.id
		this.name = `${data.player.first_name} ${data.player.last_name}`
		this.category = data.additional_info
		this.grossPoints = data.gross_points ?? 0
		this.netPoints = data.net_points ?? 0
	}
}

export const PlayerPointsApiSchema = z.object({
	id: z.number(),
	player: z.number(),
	gross_points: z.number().nullish(),
	net_points: z.number().nullish(),
	additional_info: z.string(),
	event: SimpleEventApiSchema,
})

export type PlayerPointsData = z.infer<typeof PlayerPointsApiSchema>

export class PlayerPoints {
	id: number
	playerId: number
	category: string
	grossPoints: number
	netPoints: number
	event: SimpleEvent

	constructor(data: PlayerPointsData) {
		this.id = data.id
		this.playerId = data.player
		this.category = data.additional_info
		this.grossPoints = data.gross_points ?? 0
		this.netPoints = data.net_points ?? 0
		this.event = new SimpleEvent(data.event)
	}
}
