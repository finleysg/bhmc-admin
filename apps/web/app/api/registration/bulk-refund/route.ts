import { NextRequest, NextResponse } from "next/server"

import { fetchSSEWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const eventId = request.nextUrl.searchParams.get("eventId")

	if (!eventId) {
		return NextResponse.json({ error: "eventId is required" }, { status: 400 })
	}

	return fetchSSEWithAuth({
		request,
		backendPath: `/admin-registration/${eventId}/bulk-refund`,
	})
}
