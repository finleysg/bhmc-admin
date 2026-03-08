import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; registrationId: string }> },
) {
	const { id, registrationId } = await params
	return fetchWithAuth({
		request,
		backendPath: `/payments/${id}/admin-payment/${registrationId}`,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
