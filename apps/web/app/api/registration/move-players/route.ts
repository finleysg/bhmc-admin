import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(request: NextRequest) {
	const eventId = request.nextUrl.searchParams.get("eventId")

	if (!eventId) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	const backendPath = `/registration/${eventId}/move-players`
	let body: Record<string, unknown>
	try {
		body = (await request.json()) as Record<string, unknown>
	} catch {
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
	}

	return fetchWithAuth({ request, backendPath, method: "POST", body })
}
