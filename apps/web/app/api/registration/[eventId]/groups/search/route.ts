import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

/**
 * Proxy a group search for an event using the `searchText` query parameter.
 *
 * @param request - Incoming Next.js request; must include the `searchText` query parameter
 * @param params - Promise resolving to route parameters; must include `eventId` used to build the backend path
 * @returns A NextResponse with the backend search result; if `searchText` is missing or shorter than 3 characters, returns a 400 JSON error
 */
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