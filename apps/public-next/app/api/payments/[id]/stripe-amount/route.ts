import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return fetchWithAuth({
		request,
		backendPath: `/payments/${id}/stripe-amount`,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
