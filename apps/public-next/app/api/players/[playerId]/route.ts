import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params

	return fetchWithAuth({
		request,
		backendPath: `/players/${playerId}/`,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
