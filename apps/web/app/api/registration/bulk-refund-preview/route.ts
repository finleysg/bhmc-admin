import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const eventId = request.nextUrl.searchParams.get("eventId")

	if (!eventId) {
		return NextResponse.json({ error: "eventId is required" }, { status: 400 })
	}

	const backendPath = `/admin-registration/${eventId}/bulk-refund-preview`
	return fetchWithAuth({ request, backendPath })
}
