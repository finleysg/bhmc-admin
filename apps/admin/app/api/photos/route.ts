import { NextRequest } from "next/server"

import { fetchFormDataWithAuth } from "@/lib/api-proxy"

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	return fetchFormDataWithAuth({
		request,
		backendPath: "/photos/",
		method: "POST",
		formData,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
}
