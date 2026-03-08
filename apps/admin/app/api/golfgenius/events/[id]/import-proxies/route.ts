import { NextRequest } from "next/server"

import { fetchSSEWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	return fetchSSEWithAuth({
		request,
		backendPath: `/golfgenius/events/${id}/import-proxies`,
	})
}
