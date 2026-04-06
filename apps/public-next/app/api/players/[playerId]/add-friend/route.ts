import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params
	return fetchWithAuth({
		request,
		backendPath: `/players/${playerId}/add_friend/`,
		method: "POST",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
