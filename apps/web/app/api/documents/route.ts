import { NextRequest } from "next/server"

import { fetchFormDataWithAuth, fetchWithAuth } from "@/lib/api-proxy"

export async function GET(request: NextRequest) {
	return fetchWithAuth({ request, backendPath: "/documents/" })
}

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	return fetchFormDataWithAuth({
		request,
		backendPath: "/documents/",
		method: "POST",
		formData,
	})
}
