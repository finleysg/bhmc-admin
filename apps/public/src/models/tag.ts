import { z } from "zod"

export const TagApiSchema = z.object({
	id: z.number(),
	name: z.string(),
})

export type TagData = z.infer<typeof TagApiSchema>

export class Tag {
	id: number
	tag: string
	canRemove: boolean = true

	constructor(data: TagData) {
		this.id = data.id
		this.tag = data.name
	}
}
