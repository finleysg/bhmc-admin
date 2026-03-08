import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"
import { INTEGRATION_ACTION_ENDPOINTS } from "@/lib/integration-actions"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; action: string }> },
) {
	const { id, action } = await params

	// Validate that the action is a known endpoint
	if (action !== "logs") {
		return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 })
	}

	const backendPath = `/golfgenius/events/${id}/${action}`

	return fetchWithAuth({
		request,
		backendPath,
		method: "GET",
	})
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; action: string }> },
) {
	const { id, action } = await params

	// Validate that the action is a known endpoint
	const validActions = Object.values(INTEGRATION_ACTION_ENDPOINTS)
	if (!validActions.includes(action)) {
		return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 })
	}

	const backendPath = `/golfgenius/events/${id}/${action}`

	return fetchWithAuth({
		request,
		backendPath,
		method: "POST",
	})
}
