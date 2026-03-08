import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	const response = await fetchWithAuth({
		request,
		backendPath: "/club-document-codes/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})

	if (!response.ok) return response

	const data = (await response.json()) as Record<string, unknown>[]
	const transformed = data.map((code) => {
		const { display_name, ...rest } = code
		return {
			...rest,
			displayName: display_name,
		}
	})
	return NextResponse.json(transformed)
}
