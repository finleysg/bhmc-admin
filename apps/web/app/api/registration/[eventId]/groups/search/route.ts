import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params
	const { searchParams } = new URL(request.url)
	const searchText = searchParams.get("searchText")

	if (!searchText || searchText.length < 3) {
		return NextResponse.json(
			{ error: "searchText parameter must be at least 3 characters" },
			{ status: 400 },
		)
	}

	const backendPath = `/registration/${eventId}/groups/search`
	return fetchWithAuth({ request, backendPath })
}
