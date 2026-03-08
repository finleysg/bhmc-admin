import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params

	const backendPath = `/events/${eventId}/append_teetime/`
	return fetchWithAuth({
		request,
		backendPath,
		method: "PUT",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
