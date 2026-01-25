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

interface UpdateStaticDocumentBody {
	code?: string
	document?: number
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Static document ID is required" }, { status: 400 })
	}

	const body = (await request.json()) as UpdateStaticDocumentBody
	const response = await fetchWithAuth({
		request,
		backendPath: `/static-documents/${id}/`,
		method: "PUT",
		body,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	const data = (await response.json()) as DjangoStaticDocument
	return NextResponse.json({
		id: data.id,
		code: data.code,
		document: transformDocument(data.document),
	})
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Static document ID is required" }, { status: 400 })
	}

	const response = await fetchWithAuth({
		request,
		backendPath: `/static-documents/${id}/`,
		method: "DELETE",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	return new NextResponse(null, { status: 204 })
}
