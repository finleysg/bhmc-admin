import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const season = url.searchParams.get("season") ?? ""
	const courseIds = url.searchParams.get("courseIds") ?? ""
	const scoreType = url.searchParams.get("scoreType") ?? ""

	const params = new URLSearchParams()
	if (courseIds) params.set("courseIds", courseIds)
	if (scoreType) params.set("scoreType", scoreType)
	const qs = params.toString()

	return fetchWithAuth({
		request,
		backendPath: `/reports/member/scores/${season}/export${qs ? `?${qs}` : ""}`,
		responseType: "binary",
		filename: `my-scores-${season}`,
		apiBaseUrl: process.env.API_URL,
	})
}
