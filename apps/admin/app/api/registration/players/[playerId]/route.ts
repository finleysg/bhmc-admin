import { type NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params
	if (!playerId) {
		return NextResponse.json({ error: "playerId is required" }, { status: 400 })
	}
	return fetchWithAuth({ request, backendPath: `/registration/players/${playerId}` })
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const { playerId } = await params
	if (!playerId) {
		return NextResponse.json({ error: "playerId is required" }, { status: 400 })
	}
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: `/registration/players/${playerId}`,
		method: "PATCH",
		body,
	})
}
