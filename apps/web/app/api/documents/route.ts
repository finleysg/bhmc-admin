import { NextRequest, NextResponse } from "next/server"

import { fetchFormDataWithAuth, fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const response = await fetchWithAuth({
		request,
		backendPath: "/documents/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	const data = await response.json()
	const transformed = data.map((doc: Record<string, unknown>) => ({
		...doc,
		documentType: doc.document_type,
		eventType: doc.event_type,
		createdBy: doc.created_by,
		lastUpdate: doc.last_update,
	}))
	return NextResponse.json(transformed)
}

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	return fetchFormDataWithAuth({
		request,
		backendPath: "/documents/",
		method: "POST",
		formData,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
