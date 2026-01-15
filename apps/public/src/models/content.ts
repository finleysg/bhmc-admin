import { z } from "zod"

export const ContentApiSchema = z.object({
	id: z.number(),
	key: z.string(),
	title: z.string(),
	content: z.string(),
})

export type ContentData = z.infer<typeof ContentApiSchema>

export class Content {
	id: number
	key: string
	title: string
	content: string

	constructor(data: ContentData | undefined | null) {
		this.id = data?.id ?? 0
		this.key = data?.key ?? "unknown"
		this.title = data?.title ?? "loading..."
		this.content = data?.content ?? "loading..."
	}
}
