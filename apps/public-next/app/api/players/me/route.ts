import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	return fetchWithAuth({
		request,
		backendPath: "/players/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}

export async function PUT(request: NextRequest) {
	const url = new URL(request.url)
	const playerId = url.searchParams.get("id")
	if (!playerId) {
		return Response.json({ error: "Player ID required" }, { status: 400 })
	}
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/players/${playerId}/`,
		method: "PUT",
		body,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
