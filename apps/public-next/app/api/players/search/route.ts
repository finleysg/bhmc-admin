import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	return fetchWithAuth({
		request,
		backendPath: "/players/search/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
