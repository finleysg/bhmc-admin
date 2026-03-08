import { NextRequest, NextResponse } from "next/server"

import { fetchFormDataWithAuth, fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const response = await fetchWithAuth({
		request,
		backendPath: "/documents/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	const data = (await response.json()) as Record<string, unknown>[]
	const transformed = data.map((doc) => {
		const { document_type, event_type, created_by, last_update, ...rest } = doc
		return {
			...rest,
			documentType: document_type,
			eventType: event_type,
			createdBy: created_by,
			lastUpdate: last_update,
		}
	})
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
