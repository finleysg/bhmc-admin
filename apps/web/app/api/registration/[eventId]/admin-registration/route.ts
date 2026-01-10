// Proxy PUT requests for admin registration completion to backend API

import { NextRequest } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ eventId: string }> },
) {
	const params = await context.params
	const backendPath = `/registration/${params.eventId}/admin-registration`
	return fetchWithAuth({
		request,
		backendPath,
		method: "POST",
		body: await request.json(),
	})
}
