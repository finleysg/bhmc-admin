import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	return fetchWithAuth({
		request,
		backendPath: "/tournament-points/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
