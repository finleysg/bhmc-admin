import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	return fetchWithAuth({
		request,
		backendPath: `/reports/events/${id}/membership-report/excel`,
		responseType: "binary",
		filename: `membership-report-${id}`,
	})
}
