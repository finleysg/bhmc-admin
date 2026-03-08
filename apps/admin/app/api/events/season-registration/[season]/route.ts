import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ season: string }> },
) {
	const { season } = await params

	if (!season) {
		return NextResponse.json({ error: "Season is required" }, { status: 400 })
	}

	const backendPath = `/events/season-registration/${season}`
	return fetchWithAuth({ request, backendPath })
}
