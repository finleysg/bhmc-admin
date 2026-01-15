import { z } from "zod"

import { Player, PlayerApiSchema } from "./player"

export const BoardMemberApiSchema = z.object({
	id: z.number(),
	player: PlayerApiSchema,
	role: z.string(),
	term_expires: z.number(),
})

export type BoardMemberData = z.infer<typeof BoardMemberApiSchema>

export class BoardMember {
	id: number
	player: Player
	role: string
	expires: number

	constructor(data: BoardMemberData) {
		this.id = data.id
		this.player = new Player(data.player)
		this.role = data.role
		this.expires = data.term_expires
	}
}

export interface BoardMemberProps {
	boardMember?: BoardMember
}
