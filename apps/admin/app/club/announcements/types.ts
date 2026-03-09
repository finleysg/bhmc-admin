export interface AnnouncementDocument {
	id: number
	title: string
	documentType: string
	file: string | null
	year: number | null
	lastUpdate: string
}

export interface Announcement {
	id: number
	title: string
	text: string
	visibility: string
	starts: string
	expires: string
	eventId: number | null
	documents: AnnouncementDocument[]
}

export interface AnnouncementFormData {
	title: string
	text: string
	visibility: string
	starts: string
	expires: string
	eventId: number | null
	documentIds: number[]
}

export interface AvailableDocument {
	id: number
	title: string
	document_type: string
	year: number | null
}

export interface ClubEvent {
	id: number
	name: string
	startDate: string
}
