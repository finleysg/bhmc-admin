import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params
	return fetchWithAuth({
		request,
		backendPath: `/registration/${id}`,
		forwardHeaders: CORRELATION_HEADERS,
	})
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/registration/${id}`,
		method: "PATCH",
		body,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
