import { NextRequest } from "next/server"

import { fetchPublic } from "@/lib/api-proxy"

export async function POST(request: NextRequest) {
	const body: unknown = await request.json()

	return fetchPublic({
		backendPath: "/contact/",
		method: "POST",
		body,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
