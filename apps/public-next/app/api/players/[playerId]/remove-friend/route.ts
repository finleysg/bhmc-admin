import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/players/${playerId}/remove_friend/`,
		method: "POST",
		body,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
