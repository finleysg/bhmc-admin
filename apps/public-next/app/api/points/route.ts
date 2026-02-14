import { NextRequest } from "next/server"

import { fetchPublic } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const params = new URLSearchParams()

	const season = searchParams.get("season")
	const category = searchParams.get("category")
	const top = searchParams.get("top")

	if (season) params.set("season", season)
	if (category) params.set("category", category)
	if (top) params.set("top", top)

	const query = params.toString()
	const backendPath = query
		? `/season-long-points/top_points/?${query}`
		: "/season-long-points/top_points/"

	return fetchPublic({
		backendPath,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
