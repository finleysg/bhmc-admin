import { z } from "zod"

import { BhmcDocument, DocumentApiSchema } from "./document"

export const AnnouncementApiSchema = z.object({
	id: z.number(),
	text: z.string(),
	title: z.string(),
	event: z.number().nullish(),
	visibility: z.string(),
	starts: z.coerce.date(),
	expires: z.coerce.date(),
	documents: z.array(DocumentApiSchema).optional(),
})

export type AnnouncementData = z.infer<typeof AnnouncementApiSchema>

export class Announcement {
	id: number
	title: string
	text: string
	event?: number | null
	visibility: string
	starts: Date
	expires: Date
	documents?: BhmcDocument[]

	constructor(data: AnnouncementData) {
		this.id = data.id
		this.title = data.title
		this.text = data.text
		this.event = data.event
		this.visibility = data.visibility
		this.starts = data.starts
		this.expires = data.expires
		this.documents = data.documents?.map((d) => new BhmcDocument(d)) ?? []
	}
}
