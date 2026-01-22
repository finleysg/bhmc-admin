import { NextRequest, NextResponse } from "next/server"

interface FetchWithAuthOptions {
	request: NextRequest
	backendPath: string // e.g., "/events/search?date=2024-01-01"
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
	body?: unknown
	responseType?: "json" | "binary" // Default: "json"
	filename?: string // For Content-Disposition in binary mode
}

interface FetchSSEWithAuthOptions {
	request: NextRequest
	backendPath: string // e.g., "/golfgenius/events/123/import-points"
}

interface FetchFormDataWithAuthOptions {
	request: NextRequest
	backendPath: string
	method: "POST" | "PUT"
	formData: FormData
}

/**
 * Extracts the Django auth token from cookies.
 * Django sets an httponly cookie named "access_token".
 */
function getAuthToken(request: NextRequest): string | null {
	const cookie = request.cookies.get("access_token")
	return cookie?.value || null
}

/**
 * Centralized utility for making authenticated requests to the backend API.
 * Forwards the Django auth token to the NestJS backend for validation.
 */
export async function fetchWithAuth({
	request,
	backendPath,
	method = "GET",
	body,
	responseType = "json",
	filename,
}: FetchWithAuthOptions): Promise<NextResponse> {
	try {
		const token = getAuthToken(request)

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Forward the request to the backend API with the Django token
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		// Forward query parameters from the incoming request
		const url = new URL(request.url)
		const searchParams = url.searchParams.toString()
		const backendUrl = searchParams
			? `${apiUrl}${backendPath}?${searchParams}`
			: `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			method,
			headers: {
				Authorization: `Token ${token}`,
				"Content-Type": "application/json",
			},
			...(body ? { body: JSON.stringify(body) } : {}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			return NextResponse.json(
				{ error: `Backend API error: ${errorText}` },
				{ status: response.status },
			)
		}

		if (responseType === "binary") {
			const buffer = await response.arrayBuffer()
			const contentType =
				response.headers.get("Content-Type") ||
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			const contentDisposition =
				response.headers.get("Content-Disposition") ||
				`attachment; filename="${filename || "report"}.xlsx"`
			return new NextResponse(buffer, {
				headers: {
					"Content-Type": contentType,
					"Content-Disposition": contentDisposition,
				},
			})
		}

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error proxying to backend API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

/**
 * Centralized utility for making authenticated SSE (Server-Sent Events) requests to the backend API.
 * Forwards the Django auth token to the NestJS backend for validation.
 */
export async function fetchSSEWithAuth({
	request,
	backendPath,
}: FetchSSEWithAuthOptions): Promise<Response> {
	try {
		const token = getAuthToken(request)

		if (!token) {
			return new Response("Unauthorized", { status: 401 })
		}

		// Connect to backend SSE endpoint
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return new Response("API URL not configured", { status: 500 })
		}

		const backendUrl = `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			headers: {
				Authorization: `Token ${token}`,
				Accept: "text/event-stream",
			},
		})

		if (!response.ok) {
			return new Response(`Backend error: ${response.status}`, { status: response.status })
		}

		// Stream the response back to client
		return new Response(response.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		})
	} catch (error) {
		console.error("Error proxying SSE:", error)
		return new Response("Internal server error", { status: 500 })
	}
}

/**
 * Centralized utility for making authenticated multipart FormData requests to the backend API.
 * Does NOT set Content-Type header - browser/fetch sets boundary automatically.
 */
export async function fetchFormDataWithAuth({
	request,
	backendPath,
	method,
	formData,
}: FetchFormDataWithAuthOptions): Promise<NextResponse> {
	try {
		const token = getAuthToken(request)

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const backendUrl = `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			method,
			headers: {
				Authorization: `Token ${token}`,
				// Do NOT set Content-Type - fetch sets multipart boundary automatically
			},
			body: formData,
		})

		if (!response.ok) {
			const errorText = await response.text()
			return NextResponse.json(
				{ error: `Backend API error: ${errorText}` },
				{ status: response.status },
			)
		}

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error proxying FormData to backend API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
