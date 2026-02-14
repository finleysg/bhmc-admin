import { NextRequest } from "next/server"

import { fetchPublic } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const params = new URLSearchParams()

	const page = searchParams.get("page")
	const tags = searchParams.get("tags")

	if (page) params.set("page", page)
	if (tags) params.set("tags", tags)

	const query = params.toString()
	const backendPath = query ? `/photos/?${query}` : "/photos/"

	return fetchPublic({
		backendPath,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
