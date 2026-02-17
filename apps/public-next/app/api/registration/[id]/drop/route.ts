import { NextRequest } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params
	return fetchWithAuth({
		request,
		backendPath: `/registration/${id}/drop/`,
		method: "DELETE",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
