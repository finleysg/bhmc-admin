import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"
import { revalidatePublicNextCache } from "@/lib/revalidate"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	const backendPath = `/events/${id}/copy_event/`
	const response = await fetchWithAuth({
		request,
		backendPath,
		method: "POST",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (response.ok) {
		await revalidatePublicNextCache("events")
	}

	return response
}
