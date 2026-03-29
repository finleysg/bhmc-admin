import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function POST(request: NextRequest) {
	return fetchWithAuth({
		request,
		backendPath: "/payments/customer-session",
		method: "POST",
		forwardHeaders: CORRELATION_HEADERS,
	})
}
