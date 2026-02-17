import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/payments/${id}/payment-intent`,
		method: "POST",
		body,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
