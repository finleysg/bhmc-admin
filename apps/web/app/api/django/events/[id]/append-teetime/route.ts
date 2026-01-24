import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	return fetchWithAuth({
		request,
		backendPath: `/events/${id}/append_teetime/`,
		apiBaseUrl: process.env.DJANGO_API_URL,
		method: "PUT",
	})
}
