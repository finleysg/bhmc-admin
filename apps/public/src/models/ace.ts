import { addDays } from "date-fns"
import { z } from "zod"

import { Player, PlayerApiSchema } from "./player"

export const AceApiSchema = z.object({
	id: z.number(),
	player: PlayerApiSchema,
	season: z.number(),
	hole_name: z.string(),
	shot_date: z.coerce.date(),
})

export type AceData = z.infer<typeof AceApiSchema>

export class Ace {
	id: number
	player: Player
	season: number
	hole: string
	shotDate: Date

	constructor(data: AceData) {
		this.id = data.id
		this.player = new Player(data.player)
		this.season = data.season
		this.hole = data.hole_name
		this.shotDate = addDays(data.shot_date, 1) // hack to fix timezone issue
	}
}
