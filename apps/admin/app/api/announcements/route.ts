import { type NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"
import { revalidatePublicNextCache } from "@/lib/revalidate"

export async function GET(request: NextRequest) {
	return fetchWithAuth({ request, backendPath: "/announcements" })
}

export async function POST(request: NextRequest) {
	const body: unknown = await request.json()
	const response = await fetchWithAuth({
		request,
		backendPath: "/announcements",
		method: "POST",
		body,
	})

	if (response.ok) {
		void revalidatePublicNextCache("announcements")
	}

	return response
}
