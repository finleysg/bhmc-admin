export const DOCUMENT_TYPES = {
	R: "Event Results",
	T: "Event Tee Times",
	L: "Event Flights",
	P: "Season Long Points",
	D: "Dam Cup",
	M: "Match Play",
	F: "Financial Statements",
	S: "Sign Up",
	O: "Other",
	Z: "Data",
} as const

export type DocumentTypeCode = keyof typeof DOCUMENT_TYPES

export interface Document {
	id: number
	year: number
	title: string
	documentType: DocumentTypeCode
	file: string
	event: number | null
	eventType: string | null
	createdBy: string
	lastUpdate: string
}

export interface ClubDocumentCode {
	id: number
	code: string
	displayName: string
	location: string
}

export interface StaticDocument {
	id: number
	code: string
	document: Document
}
