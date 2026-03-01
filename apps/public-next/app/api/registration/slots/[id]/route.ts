import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/registration-slots/${id}/`,
		method: "PATCH",
		body,
		apiBaseUrl: process.env.DJANGO_API_URL,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
