import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params

	if (!eventId) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	const backendPath = `/registration/${eventId}/reserve-admin-slots`
	const body = (await request.json()) as unknown
	return fetchWithAuth({ request, backendPath, method: "POST", body })
}
