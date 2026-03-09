import type { AnnouncementRow, DocumentRow } from "../database"

export interface AnnouncementDocument {
	id: number
	title: string
	documentType: string
	file: string | null
	year: number | null
	lastUpdate: string
}

export interface AnnouncementResponse {
	id: number
	title: string
	text: string
	visibility: string
	starts: string
	expires: string
	eventId: number | null
	documents: AnnouncementDocument[]
}

export function toAnnouncementDocument(row: DocumentRow): AnnouncementDocument {
	return {
		id: row.id,
		title: row.title,
		documentType: row.documentType,
		file: row.file,
		year: row.year,
		lastUpdate: row.lastUpdate,
	}
}

export function toAnnouncement(
	row: AnnouncementRow,
	documents: AnnouncementDocument[],
): AnnouncementResponse {
	return {
		id: row.id,
		title: row.title,
		text: row.text,
		visibility: row.visibility,
		starts: row.starts,
		expires: row.expires,
		eventId: row.eventId,
		documents,
	}
}
