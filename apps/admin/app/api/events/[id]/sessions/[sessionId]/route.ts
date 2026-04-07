import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	const { id, sessionId } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}
	if (!sessionId) {
		return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
	}

	const backendPath = `/events/${id}/sessions/${sessionId}`
	return fetchWithAuth({ request, backendPath, method: "PUT", body })
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	const { id, sessionId } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}
	if (!sessionId) {
		return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
	}

	const backendPath = `/events/${id}/sessions/${sessionId}`
	return fetchWithAuth({ request, backendPath, method: "DELETE" })
}
