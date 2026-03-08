import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function POST(request: NextRequest) {
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: "/payments/customer-session",
		method: "POST",
		body,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
