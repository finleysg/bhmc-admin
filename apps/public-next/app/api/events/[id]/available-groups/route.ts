import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const searchParams = request.nextUrl.searchParams
	const queryString = searchParams.toString()
	const path = `/events/${id}/available_groups/${queryString ? `?${queryString}` : ""}`
	return fetchWithAuth({
		request,
		backendPath: path,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
