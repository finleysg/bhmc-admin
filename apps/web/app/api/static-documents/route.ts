import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

interface DjangoDocument {
	id: number
	year: number
	title: string
	document_type: string
	file: string
	event: number | null
	event_type: string | null
	created_by: string
	last_update: string
}

interface DjangoStaticDocument {
	id: number
	code: string
	document: DjangoDocument
}

function transformDocument(doc: DjangoDocument) {
	const { document_type, event_type, created_by, last_update, ...rest } = doc
	return {
		...rest,
		documentType: document_type,
		eventType: event_type,
		createdBy: created_by,
		lastUpdate: last_update,
	}
}

export async function GET(request: NextRequest) {
	const response = await fetchWithAuth({
		request,
		backendPath: "/static-documents/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	const data = (await response.json()) as DjangoStaticDocument[]
	const transformed = data.map((staticDoc) => ({
		id: staticDoc.id,
		code: staticDoc.code,
		document: transformDocument(staticDoc.document),
	}))
	return NextResponse.json(transformed)
}
