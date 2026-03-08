import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params

	const backendPath = `/events/${eventId}/create_slots/`
	return fetchWithAuth({
		request,
		backendPath,
		method: "POST",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
