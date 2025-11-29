import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string; registrationId: string }> },
) {
	const { eventId, registrationId } = await params

	if (!eventId || !registrationId) {
		return NextResponse.json(
			{ error: "Event ID and Registration ID are required" },
			{ status: 400 },
		)
	}

	const backendPath = `/registration/${eventId}/admin-registration/${registrationId}`
	const body = (await request.json()) as unknown

	return fetchWithAuth({ request, backendPath, method: "PUT", body })
}
