import { z } from "zod"

export const DamCupApiSchema = z.object({
	id: z.number(),
	season: z.number(),
	site: z.string(),
	good_guys: z.string(),
	bad_guys: z.string(),
})

export type DamCupData = z.infer<typeof DamCupApiSchema>

export class DamCup {
	id: number
	season: number
	site: string
	ourScore: string
	theirScore: string

	constructor(data: DamCupData) {
		this.id = data.id
		this.season = data.season
		this.site = data.site
		this.ourScore = data.good_guys
		this.theirScore = data.bad_guys
	}
}
