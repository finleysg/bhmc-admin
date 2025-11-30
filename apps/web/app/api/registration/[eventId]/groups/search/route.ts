import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"

/**
 * Search groups for a specific event using the `searchText` query parameter.
 *
 * Validates that `searchText` is at least 3 characters long, then proxies the request
 * to the backend endpoint `/registration/{eventId}/groups/search`.
 *
 * @param request - Incoming Next.js request containing the `searchText` query parameter
 * @param params - Promise resolving to route parameters; must include `eventId`
 * @returns A NextResponse with the backend search result, or a 400 JSON error when `searchText` is invalid.
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