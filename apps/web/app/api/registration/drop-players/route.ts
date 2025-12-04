import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function POST(
request: NextRequest,
) {
	const registrationId = request.nextUrl.searchParams.get("registrationId")

	if (!registrationId) {
		return NextResponse.json({ error: "Registration ID is required" }, { status: 400 })
	}

	const backendPath = `/registration/${registrationId}/drop-players`
	let body: Record<string, unknown>
	try {
		body = (await request.json()) as Record<string, unknown>
	} catch {
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
	}
	
	return fetchWithAuth({ request, backendPath, method: "POST", body })
}
