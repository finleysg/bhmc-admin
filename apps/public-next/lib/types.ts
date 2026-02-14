export interface PageContent {
	id: number
	key: string
	title: string
	content: string
}

export interface AnnouncementDocument {
	id: number
	title: string
	document_type: string
	file: string
	year?: number | null
	last_update: string
}

export interface Announcement {
	id: number
	title: string
	text: string
	visibility: string
	starts: string
	expires: string
	documents: AnnouncementDocument[]
}

export interface Policy {
	id: number
	policy_type: string
	title: string
	description: string
}

export interface PlayerSummary {
	id: number
	first_name: string
	last_name: string
	email?: string | null
	is_member: boolean | number
}

export interface BoardMember {
	id: number
	player: PlayerSummary
	role: string
	term_expires: number
}

export interface Ace {
	id: number
	player: PlayerSummary
	season: number
	hole_name: string
	shot_date: string
}

export interface LowScore {
	id: number
	player: PlayerSummary
	season: number
	course_name: string
	is_net: boolean
	score: number
}

export interface ClubEvent {
	id: number
	event_type: string
	name: string
	season: number
	start_date: string
	status: string
}

export interface StaticDocumentFile {
	id: number
	title: string
	file: string
	document_type: string
	last_update: string
}

export interface StaticDocument {
	id: number
	code: string
	document: StaticDocumentFile
}

export interface PhotoData {
	id: number
	year: number
	caption: string | null
	mobile_url: string
	web_url: string
	image_url: string
}
