import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params
	return fetchWithAuth({
		request,
		backendPath: `/events/${eventId}/pairings/`,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
