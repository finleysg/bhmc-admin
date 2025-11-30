// Proxy PUT requests for admin registration completion to backend API

import { NextRequest } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function PUT(
	request: NextRequest,
	context: { params: Promise<{ eventId: string; registrationId: string }> },
) {
	const params = await context.params
	const backendPath = `/registration/${params.eventId}/admin-registration/${params.registrationId}`
	return fetchWithAuth({
		request,
		backendPath,
		method: "PUT",
		body: await request.json(),
	})
}
