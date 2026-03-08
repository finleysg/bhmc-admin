import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/registration/${eventId}/replace-player`,
		method: "POST",
		body,
	})
}
