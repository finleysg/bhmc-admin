import { z } from "zod"

import { Player, PlayerApiSchema } from "./player"

export const LowScoreApiSchema = z.object({
	id: z.number(),
	player: PlayerApiSchema,
	season: z.number(),
	course_name: z.string(),
	is_net: z.boolean(),
	score: z.number(),
})

export type LowScoreData = z.infer<typeof LowScoreApiSchema>

export class LowScore {
	id: number
	player: Player
	season: number
	courseName: string
	isNet: boolean
	score: number

	constructor(data: LowScoreData) {
		this.id = data.id
		this.player = new Player(data.player)
		this.season = data.season
		this.courseName = data.course_name
		this.isNet = data.is_net
		this.score = data.score
	}

	displayName = () => {
		return this.isNet ? `${this.courseName} Net` : `${this.courseName} Gross`
	}
}
