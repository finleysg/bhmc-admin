import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function GET(request: NextRequest) {
	return fetchWithAuth({
		request,
		backendPath: "/registration/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}

export async function POST(request: NextRequest) {
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: "/registration",
		method: "POST",
		body,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
