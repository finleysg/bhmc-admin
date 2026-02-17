import { NextRequest, NextResponse } from "next/server"

interface FetchWithAuthOptions {
	request: NextRequest
	backendPath: string
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
	body?: unknown
	responseType?: "json" | "binary"
	filename?: string
	apiBaseUrl?: string
	/** Header names to forward from the incoming request to the backend */
	forwardHeaders?: string[]
}

interface FetchPublicOptions {
	backendPath: string
	method?: "GET" | "POST"
	body?: unknown
	apiBaseUrl?: string
}

function getAuthToken(request: NextRequest): string | null {
	const cookie = request.cookies.get("access_token")
	return cookie?.value || null
}

export async function fetchWithAuth({
	request,
	backendPath,
	method = "GET",
	body,
	responseType = "json",
	filename,
	apiBaseUrl,
	forwardHeaders,
}: FetchWithAuthOptions): Promise<NextResponse> {
	try {
		const token = getAuthToken(request)

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const apiUrl = apiBaseUrl ?? process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const url = new URL(request.url)
		const searchParams = url.searchParams.toString()
		const backendUrl = searchParams
			? `${apiUrl}${backendPath}?${searchParams}`
			: `${apiUrl}${backendPath}`

		const extraHeaders: Record<string, string> = {}
		if (forwardHeaders) {
			for (const name of forwardHeaders) {
				const value = request.headers.get(name)
				if (value) extraHeaders[name] = value
			}
		}

		const response = await fetch(backendUrl, {
			method,
			headers: {
				Authorization: `Token ${token}`,
				"Content-Type": "application/json",
				...extraHeaders,
			},
			...(body ? { body: JSON.stringify(body) } : {}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			let errorBody: unknown
			try {
				errorBody = JSON.parse(errorText)
			} catch {
				errorBody = { error: errorText }
			}
			return NextResponse.json(errorBody, { status: response.status })
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

		if (response.status === 204) {
			return new NextResponse(null, { status: 204 })
		}

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error proxying to backend API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

/**
 * Unauthenticated variant for public SSR pages that don't require login.
 */
export async function fetchPublic({
	backendPath,
	method = "GET",
	body,
	apiBaseUrl,
}: FetchPublicOptions): Promise<NextResponse> {
	try {
		const apiUrl = apiBaseUrl ?? process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const backendUrl = `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			method,
			headers: {
				"Content-Type": "application/json",
			},
			...(body ? { body: JSON.stringify(body) } : {}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			let errorBody: unknown
			try {
				errorBody = JSON.parse(errorText)
			} catch {
				errorBody = { error: errorText }
			}
			return NextResponse.json(errorBody, { status: response.status })
		}

		if (response.status === 204) {
			return new NextResponse(null, { status: 204 })
		}

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error fetching public API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
