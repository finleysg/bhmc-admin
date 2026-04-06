import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params
	return fetchWithAuth({
		request,
		backendPath: `/players/${playerId}/remove_friend/`,
		method: "DELETE",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
