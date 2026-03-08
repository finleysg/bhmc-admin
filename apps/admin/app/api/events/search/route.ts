import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const date = searchParams.get("date")

	if (!date) {
		return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
	}

	const backendPath = `/events/search?date=${encodeURIComponent(date)}`
	return fetchWithAuth({ request, backendPath })
}
