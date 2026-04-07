import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	const backendPath = `/events/${id}/sessions`
	return fetchWithAuth({ request, backendPath })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
	}

	const backendPath = `/events/${id}/sessions`
	return fetchWithAuth({ request, backendPath, method: "POST", body })
}
