import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const eventId = url.searchParams.get("event_id")
	const type = url.searchParams.get("type")

	if (!eventId) {
		return NextResponse.json({ error: "event_id query parameter is required" }, { status: 400 })
	}

	// Build Django API path with query params
	let backendPath = `/documents/?event_id=${eventId}`
	if (type) {
		backendPath += `&type=${type}`
	}

	return fetchWithAuth({
		request,
		backendPath,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
