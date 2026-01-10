import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const season = searchParams.get("season")

	if (!season) {
		return NextResponse.json({ error: "Season parameter is required" }, { status: 400 })
	}

	return fetchWithAuth({ request, backendPath: "/events" })
}
