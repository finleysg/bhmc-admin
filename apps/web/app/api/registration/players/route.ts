import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const searchText = searchParams.get("searchText")
	const isMember = searchParams.get("isMember")

	if (!searchText || searchText.length < 3) {
		return NextResponse.json(
			{ error: "searchText parameter must be at least 3 characters" },
			{ status: 400 },
		)
	}

	const backendPath = "/registration/players"
	return fetchWithAuth({ request, backendPath })
}
